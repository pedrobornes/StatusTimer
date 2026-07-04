package com.statustimer.repository;

import com.statustimer.entity.Game;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface GameRepository extends JpaRepository<Game, Long> {

    @Query("SELECT g FROM Game g LEFT JOIN FETCH g.platforms WHERE g.slug = :slug")
    Optional<Game> findBySlug(String slug);

    @Override
    @EntityGraph(attributePaths = {"platforms"})
    List<Game> findAll();

    @EntityGraph(attributePaths = {"platforms"})
    Optional<Game> findById(Long id);
}
