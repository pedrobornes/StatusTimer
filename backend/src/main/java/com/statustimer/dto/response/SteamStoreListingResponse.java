package com.statustimer.dto.response;

public record SteamStoreListingResponse(
        Integer steamAppId,
        String shortDescription,
        Integer priceFinal,
        String currency,
        boolean windows,
        boolean mac,
        boolean linux,
        boolean freeToPlay
) {
}
