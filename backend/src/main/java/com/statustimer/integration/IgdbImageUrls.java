package com.statustimer.integration;

public final class IgdbImageUrls {

    private static final String BASE = "https://images.igdb.com/igdb/image/upload";

    private IgdbImageUrls() {
    }

    public static String coverBig(String imageId) {
        return image(imageId, "t_cover_big");
    }

    public static String coverSmall(String imageId) {
        return image(imageId, "t_cover_small");
    }

    public static String thumb(String imageId) {
        return image(imageId, "t_thumb");
    }

    private static String image(String imageId, String size) {
        if (imageId == null || imageId.isBlank()) {
            return null;
        }

        return "%s/%s/%s.jpg".formatted(BASE, size, imageId.trim());
    }
}
