exports.pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);

exports.asyncPipe = (...fns) => (x) => fns.reduce((p, f) => p.then(f), Promise.resolve(x));