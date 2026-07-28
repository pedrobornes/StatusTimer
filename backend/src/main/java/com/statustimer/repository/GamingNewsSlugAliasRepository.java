package com.statustimer.repository;

import com.statustimer.entity.GamingNewsSlugAlias;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GamingNewsSlugAliasRepository extends JpaRepository<GamingNewsSlugAlias, Long> {

    boolean existsByAliasSlug(String aliasSlug);

    List<GamingNewsSlugAlias> findByNews_Id(Long newsId);

    @Query("""
            SELECT a FROM GamingNewsSlugAlias a
            JOIN FETCH a.news
            WHERE a.aliasSlug = :aliasSlug
            """)
    Optional<GamingNewsSlugAlias> findByAliasSlugWithNews(@Param("aliasSlug") String aliasSlug);
}
