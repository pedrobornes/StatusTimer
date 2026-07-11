package com.statustimer.service;

import com.statustimer.dto.request.UpsertServerStatusRequest;
import com.statustimer.config.CacheConfig;
import com.statustimer.dto.response.ServerStatusResponse;
import com.statustimer.entity.ServerStatus;
import com.statustimer.repository.ServerStatusRepository;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ServerStatusService {

    private final ServerStatusRepository serverStatusRepository;

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheConfig.PUBLIC_READ_MEDIUM_CACHE)
    public List<ServerStatusResponse> findAll() {
        return serverStatusRepository.findAll().stream()
                .map(ServerStatusResponse::fromEntity)
                .toList();
    }

    @Transactional
    @CacheEvict(cacheNames = CacheConfig.PUBLIC_READ_MEDIUM_CACHE, allEntries = true)
    public ServerStatusResponse upsert(UpsertServerStatusRequest request) {
        ServerStatus serverStatus = resolveExisting(request)
                .map(existing -> {
                    request.applyTo(existing);
                    return existing;
                })
                .orElseGet(request::toNewEntity);

        return ServerStatusResponse.fromEntity(serverStatusRepository.save(serverStatus));
    }

    private Optional<ServerStatus> resolveExisting(UpsertServerStatusRequest request) {
        if (request.serviceSlug() != null && !request.serviceSlug().isBlank()) {
            Optional<ServerStatus> bySlug = serverStatusRepository.findByServiceSlug(request.serviceSlug());
            if (bySlug.isPresent()) {
                return bySlug;
            }
        }

        return serverStatusRepository.findByServiceName(request.serviceName());
    }
}
