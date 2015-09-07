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

var production = (function() {
    return argv.p || argv.production;
})();

// set version number to include build time
var epoch = Date.now();
var version = package.version + '.' + epoch;

var BuildDest = './build';

gulp.task('clean', function() {
    return del([ path.join(BuildDest, '**') ]);
});

gulp.task('assets', function() {
    return gulp.src('./assets/**')
        .pipe(gulp.dest( path.join(BuildDest, 'assets') ));
});

gulp.task('manifest', function() {
    return gulp.src('manifest.json')
        .pipe(each(function(content, file, cb) {
            var manifest = JSON.parse(content);
            manifest.version = version;
            cb(null, JSON.stringify(manifest, false, 2));
        }))
        .pipe(gulp.dest(BuildDest));
});
gulp.task('html', function() {
    gulp.src('*.html').pipe(gulp.dest(BuildDest));
});

gulp.task('js', function() {
    return gulp.src([
            'main.js',
            'notifications.js',
            'script.js'
        ])
        .pipe(gulpif(production, stripdebug()))
        .pipe(gulpif(production, uglify()))
        .pipe(gulp.dest(BuildDest));
});

gulp.task('zip', ['assets', 'js', 'html', 'manifest'], function() {
    var filename = package.name + 'v' + version + '.zip';
    
    return gulp.src(path.join(BuildDest, '**'))
        .pipe(zip(filename))
        .pipe(gulp.dest(BuildDest));
});

gulp.task('build', ['assets', 'js', 'html', 'manifest', 'zip']);

gulp.task('default', ['clean'], function() {
    return gulp.start('build');
});
