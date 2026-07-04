package com.statustimer.service;

import com.statustimer.dto.response.UpcomingReleaseResponse;
import com.statustimer.entity.UpcomingRelease;
import com.statustimer.repository.UpcomingReleaseRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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

    @Transactional
    public UpcomingReleaseResponse incrementHype(Long id) {
        UpcomingRelease release = upcomingReleaseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Upcoming release not found"
                ));

        release.setHypeCount(release.getHypeCount() + 1);
        return UpcomingReleaseResponse.fromEntity(upcomingReleaseRepository.save(release));
    }
}
