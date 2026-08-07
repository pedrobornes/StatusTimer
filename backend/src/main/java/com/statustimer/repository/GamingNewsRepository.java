package com.statustimer.repository;

import com.statustimer.entity.GamingNews;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GamingNewsRepository extends JpaRepository<GamingNews, Long> {

    List<GamingNews> findAllByOrderByCreatedAtDesc();

    List<GamingNews> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<GamingNews> findByGame_SlugOrderByCreatedAtDesc(String gameSlug, Pageable pageable);

    List<GamingNews> findByGameTagOrderByCreatedAtDesc(String gameTag, Pageable pageable);

    List<GamingNews> findByGame_Id(Long gameId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            value = """
                    UPDATE gaming_news
                    SET game_id = :canonicalId,
                        game_tag = :canonicalSlug
                    WHERE game_id = :duplicateId
                    """,
            nativeQuery = true
    )
    int reassignGameIdToCanonical(
            @Param("canonicalId") Long canonicalId,
            @Param("canonicalSlug") String canonicalSlug,
            @Param("duplicateId") Long duplicateId
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            value = """
                    UPDATE gaming_news
                    SET game_id = :canonicalId,
                        game_tag = :canonicalSlug
                    WHERE LOWER(game_tag) = LOWER(:duplicateSlug)
                      AND (game_id IS NULL OR game_id = :duplicateId)
                    """,
            nativeQuery = true
    )
    int reassignGameTagToCanonical(
            @Param("canonicalId") Long canonicalId,
            @Param("canonicalSlug") String canonicalSlug,
            @Param("duplicateSlug") String duplicateSlug,
            @Param("duplicateId") Long duplicateId
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            value = "UPDATE gaming_news SET game_id = NULL WHERE game_id = :duplicateId",
            nativeQuery = true
    )
    int detachGameId(@Param("duplicateId") Long duplicateId);

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

    @Query("""
            SELECT COUNT(n) FROM GamingNews n
            LEFT JOIN n.game g
            WHERE LOWER(COALESCE(g.slug, '')) = LOWER(:gameSlug)
               OR LOWER(COALESCE(n.gameTag, '')) = LOWER(:gameTag)
            """)
    long countForGameSlug(
            @Param("gameSlug") String gameSlug,
            @Param("gameTag") String gameTag
    );
}
