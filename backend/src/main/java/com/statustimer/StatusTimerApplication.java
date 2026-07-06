package com.statustimer;

import com.statustimer.config.DotenvLoader;
import com.statustimer.config.IgdbProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableConfigurationProperties(IgdbProperties.class)
@EnableScheduling
public class StatusTimerApplication {

    public static void main(String[] args) {
        DotenvLoader.loadIfPresent();
        SpringApplication.run(StatusTimerApplication.class, args);
    }
}
