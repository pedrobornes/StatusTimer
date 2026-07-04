package com.statustimer.service;

import com.statustimer.dto.response.UpcomingReleaseResponse;
import com.statustimer.repository.UpcomingReleaseRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UpcomingReleaseService {

    private final UpcomingReleaseRepository upcomingReleaseRepository;

    @Transactional(readOnly = true)
    public List<UpcomingReleaseResponse> findAll() {
        return upcomingReleaseRepository.findAllByOrderByReleaseDateAsc().stream()
                .map(UpcomingReleaseResponse::fromEntity)
                .toList();
    }
}
