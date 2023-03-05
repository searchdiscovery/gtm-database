'use strict';

// @see https://www.freecodecamp.org/news/pipe-and-compose-in-javascript-5b04004ac937/
exports.pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);

exports.asyncPipe = (...fns) => (x) => fns.reduce((p, f) => p.then(f), Promise.resolve(x));