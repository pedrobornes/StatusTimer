package com.statustimer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class StatusTimerApplication {

    public static void main(String[] args) {
        SpringApplication.run(StatusTimerApplication.class, args);
    }
}
