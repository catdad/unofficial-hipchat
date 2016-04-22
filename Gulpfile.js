/* jshint node: true */

var path = require('path').posix;

var gulp = require('gulp');
var del = require('del');
var each = require('gulp-each');
var filter = require('gulp-filter');
var uglify = require('gulp-uglify');
var stripdebug = require('gulp-strip-debug');
var gulpif = require('gulp-if');
var zip = require('gulp-zip');
var less = require('gulp-less');

var argv = require('yargs').argv;
var package = require('./package.json');

process.title = package.name + ' (build)';

var production = (function() {
    return argv.p || argv.production;
})();

// set version number to include build time
var epoch = Date.now();

var Version = function(verStr) {
    var arr = verStr.split('.');
    
    this.major = arr[0] || undefined;
    this.minor = arr[1] || undefined;
    this.majorRevision = arr[2] || undefined;
    this.minorRevision = arr[4] || undefined;
    
    this.toString = function() {
        var tempArr = [this.major, this.minor, this.majorRevision, this.minorRevision];
        var arr = [];
        var temp = tempArr.shift();
        
        while(temp !== undefined) {
            arr.push(temp);
            temp = tempArr.shift();
        }
        
        return arr.join('.');
    };
};

var calculateVersion = function(verStr) {
    
    function pad(num, size) {
        size = size || 2;
        var s = num + "";
        while (s.length < size) { s = "0" + s; }
        return s;
    }
    
    var ver = new Version(verStr);
    var date = new Date();
    var year = date.getUTCFullYear().toString().substr(2);
    var julian = pad(getJulian(date), 3);
    var hour = date.getUTCHours();
    var min = pad(date.getUTCMinutes(), 2);
    
    ver.majorRevision = '' + year + julian;
    ver.minorRevision = parseInt('' + hour + min);
    
    return ver.toString();
};

var version = calculateVersion(package.version).toString();

console.log(version);

var BuildDest = './build';
var JSSource = [
    './main.js',
    './app.js',
    './app-util.js',
    './app-accounts.js',
//    './inject-xhr.js',
//    './inject-options.js',
    './inject-notifications.js',
    './inject-logon.js',
    './analytics/**'
];
var LessRootSource = './less/app.less';
var LessSource = './less/**/*.less';
var HTMLSource = './*.html';
var ManifestSource = './manifest.json';
var AssetsSource = './assets/**';
var AnalyicsSource = './analytics/**';

gulp.task('clean', function() {
    return del([ path.join(BuildDest, '**') ]);
});

gulp.task('assets', function() {
    return gulp.src(AssetsSource)
        .pipe(gulp.dest( path.join(BuildDest, 'assets') ));
});

gulp.task('less', function() {
    return gulp.src(LessRootSource)
        .pipe(less())
        .pipe(gulp.dest('.'));
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
    var analyticsFilter = filter('google-analytics-bundle.js', { restore: true });
    
    return gulp.src(JSSource, { base: './' })
        .pipe(analyticsFilter)
        .pipe(gulpif(production, stripdebug()))
        .pipe(gulpif(production, uglify()))
        .pipe(analyticsFilter.restore)
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


// TODO this does not really belong in the file
function isLeap(y){
    if (y%400 === 0) return true;
    else if (y%100 === 0) return false;
    else if (y%4 === 0) return true;
    else return false;
}

function getJulian(date){
    var day = date.getUTCDate(),
        month = date.getUTCMonth() + 1, //month starts at 0
        year = date.getUTCFullYear(),
        doy = 0;

    switch(month) {
        case 1:
            doy = day;
            break;
        case 2:
            doy = day + 31;
            break;
        default:
            doy = Math.floor(30.6*month - 91.4) + day; //floor(30.6 (m + 1)) + d - 122
            doy += (isLeap(year)) ? 60:59;
            break;
    }

    return doy; // date on egg cartons starts at 1 (or maybe 0)
}
