package ch.so.agi.datasheet.config;

import java.time.Clock;
import org.springframework.context.annotation.*;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration(proxyBeanMethods = false)
@EnableScheduling
public class RuntimeConfig {
    @Bean public Clock clock() { return Clock.systemUTC(); }
}
