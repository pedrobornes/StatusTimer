package com.statustimer.service;

import com.statustimer.dto.request.UpsertServerStatusRequest;
import com.statustimer.dto.response.ServerStatusResponse;
import com.statustimer.entity.ServerStatus;
import com.statustimer.repository.ServerStatusRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ServerStatusService {

    private final ServerStatusRepository serverStatusRepository;

    @Transactional(readOnly = true)
    public List<ServerStatusResponse> findAll() {
        return serverStatusRepository.findAll().stream()
                .map(ServerStatusResponse::fromEntity)
                .toList();
    }

    @Transactional
    public ServerStatusResponse upsert(UpsertServerStatusRequest request) {
        ServerStatus serverStatus = serverStatusRepository
                .findByServiceName(request.serviceName())
                .map(existing -> {
                    request.applyTo(existing);
                    return existing;
                })
                .orElseGet(request::toNewEntity);

        return ServerStatusResponse.fromEntity(serverStatusRepository.save(serverStatus));
    }
}
