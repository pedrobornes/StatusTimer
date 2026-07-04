package com.statustimer.service;

import com.statustimer.dto.request.CreateGamingNewsRequest;
import com.statustimer.dto.response.GamingNewsResponse;
import com.statustimer.repository.GamingNewsRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GamingNewsService {

    private final GamingNewsRepository gamingNewsRepository;

    @Transactional(readOnly = true)
    public List<GamingNewsResponse> findLatest() {
        return gamingNewsRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(GamingNewsResponse::fromEntity)
                .toList();
    }

    @Transactional
    public GamingNewsResponse create(CreateGamingNewsRequest request) {
        return GamingNewsResponse.fromEntity(
                gamingNewsRepository.save(request.toEntity(LocalDateTime.now()))
        );
    }
}
