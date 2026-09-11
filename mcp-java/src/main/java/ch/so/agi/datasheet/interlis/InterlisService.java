package ch.so.agi.datasheet.interlis;

import ch.so.agi.datasheet.model.*;
import ch.so.agi.datasheet.model.Node;
import ch.so.agi.datasheet.service.ToolError;
import ch.ehi.basics.logging.*;
import ch.ehi.basics.settings.Settings;
import ch.interlis.ili2c.Ili2c;
import ch.interlis.ili2c.config.*;
import ch.interlis.ili2c.metamodel.TransferDescription;
import ch.interlis.iom.IomObject;
import ch.interlis.iom_j.Iom_jObject;
import ch.interlis.iom_j.xtf.*;
import ch.interlis.iox.*;
import org.interlis2.validator.Validator;
import org.springframework.stereotype.Service;
import jakarta.annotation.PreDestroy;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.function.Supplier;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.*;

/** All INTERLIS library calls share a lock because EhiLogger has global listeners. */
@Service
public class InterlisService {
    public static final String BASE = "SO_AGI_DataCatalog_Base_20260529";
    public static final String SHEET = "SO_AGI_DataCatalog_Datasheet_20260523";
    private static final String NS = "http://www.interlis.ch/xtf/2.4/";
    private static final Object LOCK = new Object();
    private final Path modelDir;
    private final TransferDescription model;

    public record Transfer(Node root, String basketId, String objectId) {}
    public record Report(boolean valid, List<Map<String, Object>> messages) {}

    public InterlisService() throws Exception {
        synchronized (LOCK) {
            modelDir = Files.createTempDirectory("datasheet-models-");
            try {
                Configuration config = new Configuration();
                config.setAutoCompleteModelList(false);
                for (String name : List.of(BASE, SHEET)) {
                    Path file = modelDir.resolve(name + ".ili");
                    try (InputStream source = getClass().getResourceAsStream("/models/" + name + ".ili")) {
                        if (source == null) throw new IOException("Missing model: " + name);
                        Files.copy(source, file);
                    }
                    config.addFileEntry(new FileEntry(file.toString(), FileEntryKind.ILIMODELFILE));
                }
                model = Ili2c.runCompiler(config);
                if (model == null) throw new IOException("INTERLIS model compilation failed");
            } catch (Exception e) {
                deleteDirectory(modelDir); throw e;
            }
        }
    }

    public Transfer read(String xml) {
        return locked(() -> {
            // The IOX reader tolerates some unknown XML; preflight rejects information we cannot preserve.
            preflight(xml);
            Xtf24Reader reader = null;
            try {
                reader = new Xtf24Reader(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
                reader.setModel(model);
                Node root = null; String bid = null, oid = null; int baskets = 0;
                boolean ended = false;
                for (IoxEvent event; (event = reader.read()) != null;) {
                    if (event instanceof StartBasketEvent basket) {
                        if (++baskets != 1 || !basket.getType().equals(SHEET + ".Metadata"))
                            throw new ToolError("invalid_xtf", "Genau ein Metadata-Basket erforderlich.");
                        bid = basket.getBid();
                    } else if (event instanceof ObjectEvent object) {
                        if (root != null) throw new ToolError("invalid_xtf", "Genau ein Dataset oder eine Serie erforderlich.");
                        IomObject iom = object.getIomObject();
                        String kind = iom.getobjecttag().equals(tag("dataset")) ? "dataset"
                                : iom.getobjecttag().equals(tag("series")) ? "series" : null;
                        if (kind == null) throw new ToolError("invalid_xtf", "Nicht unterstütztes Fachobjekt.");
                        root = fromIom(iom, kind); oid = iom.getobjectoid();
                    } else if (event instanceof EndTransferEvent) { ended = true; break; }
                }
                if (!ended || root == null || bid == null || oid == null)
                    throw new ToolError("invalid_xtf", "Unvollständiger Transfer.");
                return new Transfer(root, bid, oid);
            } catch (IoxException e) {
                throw new ToolError("invalid_xtf", e.getMessage());
            } finally {
                if (reader != null) try { reader.close(); } catch (IoxException e) { throw new IllegalStateException(e); }
            }
        });
    }

    public String write(Transfer transfer) {
        return locked(() -> {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            XtfWriter writer = null;
            try {
                writer = new XtfWriter(output, model);
                var start = new ch.interlis.iox_j.StartTransferEvent("datasheet-mcp");
                start.setVersion("2.4");
                writer.write(start);
                writer.write(new ch.interlis.iox_j.StartBasketEvent(SHEET + ".Metadata", transfer.basketId()));
                writer.write(new ch.interlis.iox_j.ObjectEvent(toIom(transfer.root(), transfer.objectId())));
                writer.write(new ch.interlis.iox_j.EndBasketEvent());
                writer.write(new ch.interlis.iox_j.EndTransferEvent());
                writer.flush();
                return editorCompatible(output.toString(StandardCharsets.UTF_8));
            } catch (IoxException e) { throw new IllegalStateException("XTF konnte nicht erzeugt werden", e); }
            finally {
                if (writer != null) try { writer.close(); } catch (IoxException e) { throw new IllegalStateException(e); }
            }
        });
    }

    public Report validate(String xml) {
        return locked(() -> {
            List<Map<String, Object>> messages = new ArrayList<>();
            LogListener listener = event -> {
                if (event.getEventKind() == LogEvent.ERROR || event.getEventKind() == LogEvent.ADAPTION) {
                    Map<String, Object> message = new LinkedHashMap<>();
                    message.put("severity", event.getEventKind() == LogEvent.ERROR ? "error" : "warning");
                    message.put("message", Objects.toString(event.getEventMsg(), ""));
                    if (event instanceof IoxLogEvent detailed) {
                        if (detailed.getSourceObjectXtfId() != null) message.put("object_id", detailed.getSourceObjectXtfId());
                        if (detailed.getModelEleQName() != null) message.put("model_element", detailed.getModelEleQName());
                    }
                    messages.add(message);
                }
            };
            Path dir = null;
            EhiLogger.getInstance().addListener(listener);
            try {
                dir = Files.createTempDirectory("datasheet-validation-");
                Path file = dir.resolve("datasheet.xtf");
                Files.writeString(file, xml, StandardCharsets.UTF_8);
                Settings settings = new Settings();
                settings.setValue(Validator.SETTING_ILIDIRS, modelDir.toString());
                settings.setValue(Validator.SETTING_MODELNAMES, SHEET);
                settings.setValue(Validator.SETTING_DISABLE_STD_LOGGER, Validator.TRUE);
                boolean valid = new Validator().validate(new String[]{file.toString()}, settings);
                if (!valid && messages.isEmpty())
                    throw new IllegalStateException("ilivalidator failed without diagnostics");
                return new Report(valid, List.copyOf(messages));
            } catch (IOException e) { throw new IllegalStateException("Validierung fehlgeschlagen", e); }
            finally {
                EhiLogger.getInstance().removeListener(listener);
                if (dir != null) deleteDirectory(dir);
            }
        });
    }

    private static String tag(String kind) {
        return switch (kind) {
            case "dataset" -> SHEET + ".Metadata.Dataset";
            case "series" -> SHEET + ".Metadata.DatasetSeries";
            case "issue" -> SHEET + ".Metadata.DatasetIssue";
            case "temporal" -> SHEET + ".Metadata.ClosedTemporalCoverage";
            case "contact" -> BASE + ".ContactPoint";
            case "attribute" -> BASE + ".DatasetAttribute";
            default -> throw new IllegalArgumentException(kind);
        };
    }
    private static IomObject toIom(Node node, String oid) {
        Iom_jObject iom = new Iom_jObject(tag(node.kind), oid);
        node.values.forEach((key, value) -> {
            String iliName = FieldCatalog.fields(node.kind).get(key).iliName();
            if (value instanceof Node child) iom.addattrobj(iliName, toIom(child, null));
            else if (value instanceof List<?> list) {
                for (Object item : list) {
                    if (item instanceof Node child) iom.addattrobj(iliName, toIom(child, null));
                    else iom.addattrvalue(iliName, item.toString());
                }
            } else iom.setattrvalue(iliName, value.toString());
        });
        return iom;
    }
    private static Node fromIom(IomObject iom, String kind) {
        Node node = new Node(kind);
        Set<String> allowed = new HashSet<>();
        FieldCatalog.fields(kind).forEach((key, field) -> {
            allowed.add(field.iliName());
            int count = iom.getattrvaluecount(field.iliName());
            if (count == 0) return;
            String type = field.type();
            if (type.startsWith("list:")) {
                List<Object> items = new ArrayList<>();
                for (int i = 0; i < count; i++) items.add(readValue(iom, field.iliName(), i, type.substring(5)));
                node.values.put(key, items);
            } else {
                if (count != 1) throw new ToolError("invalid_xtf", "Mehrfaches Einzelfeld: " + field.iliName());
                node.values.put(key, readValue(iom, field.iliName(), 0, type));
            }
        });
        for (int i = 0; i < iom.getattrcount(); i++)
            if (!allowed.contains(iom.getattrname(i))) throw new ToolError("invalid_xtf", "Unbekanntes Feld: " + iom.getattrname(i));
        return node;
    }
    private static Object readValue(IomObject iom, String field, int index, String type) {
        if (FieldCatalog.isStructure(type)) return fromIom(iom.getattrobj(field, index), type);
        String value = iom.getattrprim(field, index);
        if (type.equals("boolean")) {
            if (!Set.of("true", "false").contains(value)) throw new ToolError("invalid_xtf", "Ungültiger Boolean: " + field);
            return Boolean.valueOf(value);
        }
        return value;
    }

    /**
     * iox-ili groups structures in one wrapper; the existing editor expects one wrapper per item.
     * Split only those wrappers, preserving namespace-qualified content generated by XtfWriter.
     * The resulting XML (not the intermediate form) is validated before export.
     */
    private static String editorCompatible(String xml) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            Document document = factory.newDocumentBuilder().parse(
                    new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
            splitWrappers(document.getDocumentElement());
            var transformer = javax.xml.transform.TransformerFactory.newInstance().newTransformer();
            transformer.setOutputProperty(javax.xml.transform.OutputKeys.ENCODING, "UTF-8");
            StringWriter output = new StringWriter();
            transformer.transform(new javax.xml.transform.dom.DOMSource(document),
                    new javax.xml.transform.stream.StreamResult(output));
            return output.toString();
        } catch (Exception e) { throw new IllegalStateException("XTF-Kompatibilitätsformatierung fehlgeschlagen", e); }
    }
    private static void splitWrappers(Element parent) {
        for (Element element : children(parent)) {
            splitWrappers(element);
            if ((NS + SHEET).equals(element.getNamespaceURI())
                    && Set.of("attributes", "issues").contains(element.getLocalName())) {
                var items = children(element);
                if (items.size() > 1) {
                    for (Element item : items) {
                        Element wrapper = (Element) element.cloneNode(false);
                        wrapper.appendChild(item);
                        parent.insertBefore(wrapper, element);
                    }
                    parent.removeChild(element);
                }
            }
        }
    }

    private static void preflight(String xml) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setXIncludeAware(false);
            Element transfer = factory.newDocumentBuilder()
                    .parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8))).getDocumentElement();
            require(transfer, NS + "INTERLIS", "transfer");
            attributes(transfer, Set.of());
            structuralText(transfer);
            var sections = children(transfer);
            if (sections.size() != 2) invalid("headersection und datasection erforderlich.");
            require(sections.get(0), NS + "INTERLIS", "headersection");
            require(sections.get(1), NS + "INTERLIS", "datasection");
            attributes(sections.get(0), Set.of()); attributes(sections.get(1), Set.of());
            structuralText(sections.get(0)); structuralText(sections.get(1));
            Set<String> models = new HashSet<>();
            Set<String> headers = new HashSet<>();
            for (Element header : children(sections.get(0))) {
                requireNamespace(header, NS + "INTERLIS");
                if (!headers.add(header.getLocalName())) invalid("Doppeltes Headerfeld.");
                attributes(header, Set.of());
                switch (header.getLocalName()) {
                    case "models" -> {
                        structuralText(header);
                        for (Element model : children(header)) {
                            require(model, NS + "INTERLIS", "model"); attributes(model, Set.of());
                            if (!children(model).isEmpty()) invalid("Ungültiger Modellname.");
                            if (!models.add(model.getTextContent().trim())) invalid("Doppeltes Modell.");
                        }
                    }
                    case "sender", "comment" -> { if (!children(header).isEmpty()) invalid("Ungültiger Header."); }
                    default -> invalid("Unbekanntes Headerfeld.");
                }
            }
            if (!models.equals(Set.of(BASE, SHEET))) invalid("Nicht unterstützte Modellversionen.");
            var baskets = children(sections.get(1));
            if (baskets.size() != 1) invalid("Genau ein Basket erforderlich.");
            Element basket = baskets.getFirst();
            require(basket, NS + SHEET, "Metadata");
            attributes(basket, Set.of("bid"));
            structuralText(basket);
            if (basket.getAttributeNS(NS + "INTERLIS", "bid").isBlank()) invalid("Basket-ID fehlt.");
            var objects = children(basket);
            if (objects.size() != 1) invalid("Genau ein Dataset oder eine Serie erforderlich.");
            Element root = objects.getFirst();
            String kind = switch (root.getLocalName()) {
                case "Dataset" -> "dataset"; case "DatasetSeries" -> "series";
                default -> throw new ToolError("invalid_xtf", "Nicht unterstütztes Fachobjekt.");
            };
            requireNamespace(root, NS + SHEET); attributes(root, Set.of("tid"));
            if (root.getAttributeNS(NS + "INTERLIS", "tid").isBlank()) invalid("Objekt-ID fehlt.");
            checkFields(root, kind);
        } catch (ToolError e) { throw e; }
        catch (Exception e) { throw new ToolError("invalid_xtf", "Ungültiges XTF/XML: " + e.getMessage()); }
    }
    private static void checkFields(Element parent, String kind) {
        structuralText(parent);
        Map<String, FieldCatalog.Field> fields = new HashMap<>();
        FieldCatalog.fields(kind).values().forEach(field -> fields.put(field.iliName(), field));
        Set<String> seen = new HashSet<>();
        for (Element element : children(parent)) {
            FieldCatalog.Field field = fields.get(element.getLocalName());
            String fieldNs = NS + (Set.of("contact", "attribute", "temporal").contains(kind) ? BASE : SHEET);
            requireNamespace(element, fieldNs); attributes(element, Set.of());
            if (field == null || !seen.add(element.getLocalName()) && !field.type().startsWith("list:")) invalid("Unbekanntes oder wiederholtes Feld: " + element.getLocalName());
            String type = field.type();
            if (type.startsWith("list:")) {
                String itemType = type.substring(5);
                if (FieldCatalog.isStructure(itemType)) {
                    structuralText(element);
                    var structures = children(element);
                    for (Element structure : structures) checkStructure(structure, itemType);
                } else if (!children(element).isEmpty()) invalid("Einfacher Listenwert erwartet.");
            } else if (FieldCatalog.isStructure(type)) {
                structuralText(element);
                var structures = children(element);
                if (structures.size() != 1) invalid("Genau eine Struktur erforderlich.");
                checkStructure(structures.getFirst(), type);
            } else if (!children(element).isEmpty()) invalid("Einfacher Feldwert erwartet.");
        }
    }
    private static void checkStructure(Element element, String kind) {
        String tag = tag(kind);
        String model = tag.substring(0, tag.indexOf('.'));
        String local = tag.substring(tag.lastIndexOf('.') + 1);
        require(element, NS + model, local); attributes(element, Set.of()); checkFields(element, kind);
    }
    private static void structuralText(Element element) {
        for (org.w3c.dom.Node child = element.getFirstChild(); child != null; child = child.getNextSibling())
            if ((child.getNodeType() == org.w3c.dom.Node.TEXT_NODE
                    || child.getNodeType() == org.w3c.dom.Node.CDATA_SECTION_NODE)
                    && !child.getTextContent().isBlank()) invalid("Unerwarteter Text in Struktur: " + element.getLocalName());
    }
    private static List<Element> children(Element element) {
        List<Element> result = new ArrayList<>();
        for (org.w3c.dom.Node child = element.getFirstChild(); child != null; child = child.getNextSibling())
            if (child instanceof Element e) result.add(e);
        return result;
    }
    private static void attributes(Element element, Set<String> allowed) {
        NamedNodeMap attrs = element.getAttributes();
        for (int i = 0; i < attrs.getLength(); i++) {
            org.w3c.dom.Node attr = attrs.item(i);
            if ("http://www.w3.org/2000/xmlns/".equals(attr.getNamespaceURI())) continue;
            if (!(NS + "INTERLIS").equals(attr.getNamespaceURI()) || !allowed.contains(attr.getLocalName()))
                invalid("Nicht unterstütztes XML-Attribut: " + attr.getNodeName());
        }
    }
    private static void require(Element element, String ns, String name) {
        requireNamespace(element, ns);
        if (!name.equals(element.getLocalName())) invalid("Erwartet: " + name);
    }
    private static void requireNamespace(Element element, String ns) {
        if (!ns.equals(element.getNamespaceURI())) invalid("Nicht unterstützter Namespace: " + element.getNamespaceURI());
    }
    private static void invalid(String message) { throw new ToolError("invalid_xtf", message); }
    private static <T> T locked(Supplier<T> operation) { synchronized (LOCK) { return operation.get(); } }
    private static void deleteDirectory(Path dir) {
        try (var paths = Files.walk(dir)) {
            for (Path path : paths.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
        } catch (IOException e) { throw new IllegalStateException("Temporäre Dateien konnten nicht gelöscht werden", e); }
    }
    @PreDestroy public void close() { synchronized (LOCK) { deleteDirectory(modelDir); } }
}
