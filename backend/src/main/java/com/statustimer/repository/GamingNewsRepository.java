package com.statustimer.repository;

import com.statustimer.entity.GamingNews;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GamingNewsRepository extends JpaRepository<GamingNews, Long> {

    List<GamingNews> findAllByOrderByCreatedAtDesc();

    List<GamingNews> findByGame_SlugOrderByCreatedAtDesc(String gameSlug, Pageable pageable);

    List<GamingNews> findByGameTagOrderByCreatedAtDesc(String gameTag, Pageable pageable);

    List<GamingNews> findByGame_Id(Long gameId);

    @Query("""
            SELECT n FROM GamingNews n
            LEFT JOIN n.game g
            WHERE LOWER(COALESCE(g.slug, '')) = LOWER(:gameSlug)
               OR LOWER(COALESCE(n.gameTag, '')) = LOWER(:gameTag)
            ORDER BY n.createdAt DESC
            """)
    List<GamingNews> findAllForGameSlug(
            @Param("gameSlug") String gameSlug,
            @Param("gameTag") String gameTag,
            Pageable pageable
    );

    Optional<GamingNews> findByNewsSlug(String newsSlug);

    boolean existsByNewsSlug(String newsSlug);
}
