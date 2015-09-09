/* jshint node: true */

var path = require('path').posix;

var gulp = require('gulp');
var del = require('del');
var each = require('gulp-each');
var uglify = require('gulp-uglify');
var stripdebug = require('gulp-strip-debug');
var gulpif = require('gulp-if');
var zip = require('gulp-zip');

var argv = require('yargs').argv;
var package = require('./package.json');

process.title = package.name + ' (build)';

var production = (function() {
    return argv.p || argv.production;
})();

// set version number to include build time
var epoch = Date.now();
var version = package.version + '.' + epoch;

var BuildDest = './build';
var JSSource = [
    './main.js',
    './app.js',
    './inject-xhr.js',
    './inject-notifications.js'
];
var HTMLSource = './*.html';
var ManifestSource = './manifest.json';
var AssetsSource = './assets/**';

gulp.task('clean', function() {
    return del([ path.join(BuildDest, '**') ]);
});

gulp.task('assets', function() {
    return gulp.src(AssetsSource)
        .pipe(gulp.dest( path.join(BuildDest, 'assets') ));
});

gulp.task('manifest', function() {
    return gulp.src(ManifestSource)
        .pipe(each(function(content, file, cb) {
            var manifest = JSON.parse(content);
            manifest.version = version;
            cb(null, JSON.stringify(manifest, false, 2));
        }))
        .pipe(gulp.dest(BuildDest));
});
gulp.task('html', function() {
    gulp.src(HTMLSource).pipe(gulp.dest(BuildDest));
});

gulp.task('js', function() {
    return gulp.src(JSSource)
        .pipe(gulpif(production, stripdebug()))
        .pipe(gulpif(production, uglify()))
        .pipe(gulp.dest(BuildDest));
});

gulp.task('zip', ['assets', 'js', 'html', 'manifest'], function() {
    var filename = package.name + '.v' + version + '.zip';
    
    return gulp.src(path.join(BuildDest, '**'))
        .pipe(zip(filename))
        .pipe(gulp.dest(BuildDest));
});

gulp.task('build', ['assets', 'js', 'html', 'manifest'], function() {
    if (production) {
        return gulp.start('zip');
    }
});

gulp.task('default', ['clean'], function() {
    return gulp.start('build');
});

gulp.task('watch', ['default'], function() {
    gulp.watch(JSSource, ['js']); //.on('change', function(ev) { console.log('js', ev.path); });
    gulp.watch(HTMLSource, ['html']); //.on('change', function(ev) { console.log('html', ev.path); });
    gulp.watch(ManifestSource, ['manifest']); //.on('change', function(ev) { console.log('manifest', ev.path); });
    gulp.watch(AssetsSource, ['assets']); //.on('change', function(ev) { console.log('assets', ev.path); });
});
