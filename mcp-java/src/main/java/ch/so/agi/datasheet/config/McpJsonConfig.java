package ch.so.agi.datasheet.config;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.ai.util.JacksonUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.json.JsonMapper;

/** Preserve explicit null map entries (field deletion) and exact numeric request literals. */
@Configuration(proxyBeanMethods = false)
public class McpJsonConfig {

    @Bean(name = "mcpServerJsonMapper", defaultCandidate = false)
    public JsonMapper mcpServerJsonMapper() {
        // The SDK converts request maps internally. Keep null map contents through that
        // conversion; omit null protocol properties and leave envelope names unchanged.
        return JsonMapper.builder()
                .enable(DeserializationFeature.ACCEPT_EMPTY_STRING_AS_NULL_OBJECT,
                        DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
                .disable(SerializationFeature.FAIL_ON_EMPTY_BEANS)
                .addModules(JacksonUtils.instantiateAvailableModules())
                .changeDefaultPropertyInclusion(ignored -> JsonInclude.Value.construct(
                        JsonInclude.Include.NON_NULL, JsonInclude.Include.ALWAYS))
                .build();
    }
}
