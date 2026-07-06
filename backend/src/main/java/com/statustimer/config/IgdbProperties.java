package com.statustimer.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "igdb")
public class IgdbProperties {

    private String clientId = "";
    private String clientSecret = "";
    private int searchLimit = 8;

    public boolean isConfigured() {
        return clientId != null
                && !clientId.isBlank()
                && clientSecret != null
                && !clientSecret.isBlank();
    }
}
