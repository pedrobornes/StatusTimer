package com.statustimer.dto.request;

import java.util.List;

public record ReconcileTwitchRanksRequest(List<String> activeSlugs) {
}
