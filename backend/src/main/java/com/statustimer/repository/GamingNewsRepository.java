package com.statustimer.repository;

import com.statustimer.entity.GamingNews;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GamingNewsRepository extends JpaRepository<GamingNews, Long> {

    List<GamingNews> findAllByOrderByCreatedAtDesc();
}
