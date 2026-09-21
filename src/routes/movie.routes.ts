import { Router } from 'express';
import { createMovie, deleteMovie, getMovie, listMovies, updateMovie } from '../controllers/movie.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { idParams } from '../validators/common.validator';
import { createMovieBody, listMoviesQuery, updateMovieBody } from '../validators/movie.validator';

const router = Router();

// Public: anyone can browse
router.get('/', validate({ query: listMoviesQuery }), listMovies);
router.get('/:id', validate({ params: idParams }), getMovie);

// Cinema Admin only
router.post('/', protect, restrictTo('admin'), validate({ body: createMovieBody }), createMovie);
router.patch('/:id', protect, restrictTo('admin'), validate({ params: idParams, body: updateMovieBody }), updateMovie);
router.delete('/:id', protect, restrictTo('admin'), validate({ params: idParams }), deleteMovie);

export default router;
