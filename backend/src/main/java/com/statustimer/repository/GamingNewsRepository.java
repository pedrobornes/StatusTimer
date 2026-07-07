package com.statustimer.repository;

import com.statustimer.entity.GamingNews;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GamingNewsRepository extends JpaRepository<GamingNews, Long> {

    List<GamingNews> findAllByOrderByCreatedAtDesc();

    List<GamingNews> findByGame_SlugOrderByCreatedAtDesc(String gameSlug, Pageable pageable);

    List<GamingNews> findByGameTagOrderByCreatedAtDesc(String gameTag, Pageable pageable);

    Optional<GamingNews> findByNewsSlug(String newsSlug);

    boolean existsByNewsSlug(String newsSlug);
}
