package com.statustimer.repository;

import com.statustimer.entity.ServerStatus;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServerStatusRepository extends JpaRepository<ServerStatus, Long> {

    Optional<ServerStatus> findByServiceName(String serviceName);

    Optional<ServerStatus> findByServiceSlug(String serviceSlug);
}
