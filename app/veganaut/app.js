(function() {
    'use strict';

    // Declare the main module taking all other modules together
    var veganautModule = angular.module('veganaut.app', [
        'ngRoute',
        'ngSanitize',
        'ui.bootstrap',
        'angular-loading-bar',
        'leaflet-directive',
        'pascalprecht.translate',
        'veganaut.ui',
        'veganaut.alert',
        'veganaut.form',
        'veganaut.geocode',
        'veganaut.angularPiwik',
        'veganaut.app.backend',
        'veganaut.app.community',
        'veganaut.app.home',
        'veganaut.app.location',
        'veganaut.app.main',
        'veganaut.app.map',
        'veganaut.app.missions',
        'veganaut.app.search',
        'veganaut.app.session',
        'veganaut.app.templates',
        'veganaut.app.user'
    ]);

    veganautModule.config([
        '$routeProvider', '$locationProvider', '$compileProvider', '$translateProvider',
        'angularPiwikProvider', 'appSettings', 'piwikSettings', 'i18nSettings',
        function($routeProvider, $locationProvider, $compileProvider, $translateProvider,
            angularPiwikProvider, appSettings, piwikSettings, i18nSettings)
        {
            // Configure general settings
            $locationProvider.html5Mode(appSettings.html5Mode);
            $compileProvider.debugInfoEnabled(appSettings.debugInfo);

            // Set up routes
            $routeProvider.when('/register', {template: '<vg-register></vg-register>'});
            $routeProvider.when('/login', {templateUrl: '/veganaut/user/login.tpl.html', controller: 'LoginCtrl'});
            $routeProvider.when('/forgot', {templateUrl: '/veganaut/user/forgot.tpl.html'});
            $routeProvider.when('/reset/:token', {templateUrl: '/veganaut/user/reset.tpl.html'});

            $routeProvider.when('/', {template: '<vg-home></vg-home>'});
            $routeProvider.when('/map/', {
                template: '<vg-main-map></vg-main-map>',
                // Don't reload when get params or hash changes
                reloadOnSearch: false
            });

            // Location list (with trailing slash for Piwik)
            $routeProvider.when('/locations/', {
                template: '<vg-location-list></vg-location-list>',
                // Don't reload when get params or hash changes
                reloadOnSearch: false
            });
            $routeProvider.when('/location/:id', {templateUrl: '/veganaut/map/locationDetails.tpl.html'});
            $routeProvider.when('/location/:id/edit', {templateUrl: '/veganaut/map/editLocation.tpl.html'});
            $routeProvider.when('/me', {templateUrl: '/veganaut/user/profile.tpl.html'});
            $routeProvider.when('/me/edit', {templateUrl: '/veganaut/user/editProfile.tpl.html'});
            $routeProvider.when('/community', {template: '<vg-community></vg-community>'});
            $routeProvider.when('/veganaut/:personId', {templateUrl: '/veganaut/user/person.tpl.html', controller: 'PersonCtrl'});

            $routeProvider.otherwise({redirectTo: '/'});
            // TODO: make sure only routes are accessed that are allowed for the current situation (e.g. logged out)

            // Set up translations
            $translateProvider.useStaticFilesLoader({
                prefix: 'locale/',
                suffix: '.json'
            });
            $translateProvider.registerAvailableLanguageKeys(i18nSettings.availableLocales);
            $translateProvider.fallbackLanguage(i18nSettings.defaultLocale);
            $translateProvider.determinePreferredLanguage();
            $translateProvider.useSanitizeValueStrategy('escapeParameters');

            // Configure piwik
            angularPiwikProvider.enableTracking(piwikSettings.enabled);
            if (piwikSettings.enabled) {
                angularPiwikProvider.setPiwikDomain(piwikSettings.domain);
                angularPiwikProvider.setSiteId(piwikSettings.siteId);
            }
        }
    ]);


    // Add $onRootScope method for pub/sub
    // See https://github.com/angular/angular.js/issues/4574
    // TODO: get rid of this and use $rootScope.$broadcast and $scope.$on
    veganautModule.config(['$provide', function($provide) {
        $provide.decorator('$rootScope', ['$delegate', function($delegate) {

            $delegate.constructor.prototype.$onRootScope = function(name, listener) {
                var unsubscribe = $delegate.$on(name, listener);
                this.$on('$destroy', unsubscribe);
            };

            return $delegate;
        }]);
    }]);

    // TODO: get rid of all the modules? Not sure if they add anything...
    // Main module for components that don't belong anywhere particular
    var mainModule = angular.module('veganaut.app.main', []);

    // Define the different modules of the app
    var mapModule = angular.module('veganaut.app.map', []);
    var missionsModule = angular.module('veganaut.app.missions', []);
    var userModule = angular.module('veganaut.app.user', []);

    // New and refactored modules are not exposed through a global anymore
    angular.module('veganaut.app.community', []);
    angular.module('veganaut.app.home', []);
    angular.module('veganaut.app.location', []);
    angular.module('veganaut.app.search', []);

    // Make Leaflet available as angular service
    mapModule.value('Leaflet', window.L);

    window.veganaut = {
        mainModule: mainModule,
        mapModule: mapModule,
        missionsModule: missionsModule,
        userModule: userModule
    };
})();
