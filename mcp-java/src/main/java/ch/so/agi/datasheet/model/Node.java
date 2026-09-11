package ch.so.agi.datasheet.model;

import java.util.*;

/** Model-bound values; missing mandatory fields are intentionally representable in drafts. */
public final class Node {
    public final String kind;
    public final String id;
    public final Map<String, Object> values = new LinkedHashMap<>();

    public Node(String kind) { this(kind, UUID.randomUUID().toString()); }
    private Node(String kind, String id) { this.kind = kind; this.id = id; }

    public Node copy() {
        Node copy = new Node(kind, id);
        values.forEach((k, v) -> copy.values.put(k, copyValue(v)));
        return copy;
    }

    private static Object copyValue(Object value) {
        if (value instanceof Node node) return node.copy();
        if (value instanceof List<?> list) return new ArrayList<>(list.stream().map(Node::copyValue).toList());
        return value;
    }

    public Map<String, Object> json() {
        Map<String, Object> result = new LinkedHashMap<>();
        if (kind.equals("attribute")) result.put("attribute_id", id);
        if (kind.equals("issue")) result.put("issue_id", id);
        values.forEach((k, v) -> result.put(k, jsonValue(v)));
        return result;
    }

    private static Object jsonValue(Object value) {
        if (value instanceof Node node) return node.json();
        if (value instanceof List<?> list) return list.stream().map(Node::jsonValue).toList();
        return value;
    }

    @SuppressWarnings("unchecked")
    public List<Node> children(String field) {
        return (List<Node>) values.computeIfAbsent(field, ignored -> new ArrayList<Node>());
    }
}
