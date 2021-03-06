(function() {
    'use strict';

    /**
     * Component for the main map page.
     * Holds the map and all the actions possible on the map.
     * @returns {directive}
     */
    var mainMapDirective = function() {
        return {
            restrict: 'E',
            scope: {},
            controller: 'vgMainMapCtrl',
            controllerAs: 'mainMapVm',
            bindToController: true,
            templateUrl: '/veganaut/map/mainMap.tpl.html'
        };
    };

    // TODO: re-group variable and method definition
    // TODO: the main map should just do without angular-leaflet, it's hardly using it anymore
    var mainMapCtrl = [
        '$scope', '$location', '$route', 'Leaflet', 'angularPiwik', 'mapDefaults',
        'playerService', 'locationService', 'locationFilterService', 'mainMapService',
        function($scope, $location, $route, L, angularPiwik, mapDefaults,
            playerService, locationService, locationFilterService, mainMapService)
        {
            var vm = this;

            // Expose the global methods we still need
            // TODO: find a better way to do this
            vm.legacyGlobals = {
                goToView: $scope.$parent.goToView,
                isLoggedIn: $scope.$parent.isLoggedIn,
                isEmbedded: $scope.$parent.isEmbedded
            };

            // Expose map settings and filter service
            vm.mainMap = mainMapService;
            vm.locationFilterService = locationFilterService;

            /**
             * Locations loaded from the backend
             * @type {LocationSet}
             */
            vm.locationSet = locationService.getLocationSet();

            /**
             * Empty events object (needed to get the leaflet map to broadcast events)
             * @type {{}}
             */
            vm.events = {};

            /**
             * Whether to show the location products
             * @type {boolean}
             */
            vm.productShown = false;

            /**
             * Whether to show the location filters
             * @type {boolean}
             */
            vm.filtersShown = false;

            /**
             * whether to show search
             * @type {boolean}
             */
            vm.searchShown = false;


            // Parse legacy URL and redirect if anything found
            // TODO: Remove this after a few month of having the new URL scheme
            var hash = $location.hash();
            var legacyParams = {};
            if (hash.length > 0) {
                var hashArgs = hash.split(',');
                _.each(hashArgs, function(arg) {
                    var split = arg.split(':');
                    if (split.length === 2 && ['zoom', 'coords', 'type'].indexOf(split[0]) > -1) {
                        if (split[0] === 'coords') {
                            // Convert coords from being separated by "-" to ","
                            var match = /(-?[0-9\.]+)-(-?[0-9\.]+)/.exec(split[1]);
                            if (match) {
                                split[1] = match[1] + ',' + match[2];
                            }
                        }
                        legacyParams[split[0]] = split[1];
                    }
                });
            }
            if (Object.keys(legacyParams).length > 0) {
                // Replace the URL (no new history entry) and delete hash
                $location
                    .replace()
                    .hash(null)
                ;

                // Set new route params and make sure the route is reloaded
                $route.updateParams(legacyParams);
                $route.reload();

                // Nothing else to be done here, we are redirecting
                return;
            }

            /**
             * Leaflet map object
             * @type {{}}
             */
            vm.map = L.map('mainMap', {
                layers: [
                    L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    })
                ],
                worldCopyJump: true
            });
            vm.map.zoomControl.setPosition('bottomleft');

            /**
             * Method to inform service that the center changed
             */
            var informCenterChanged = function() {
                var newCenter = vm.map.getCenter();
                mainMapService.onCenterChanged({
                    lat: newCenter.lat,
                    lng: newCenter.lng,
                    zoom: vm.map.getZoom(),
                    boundingBox: vm.map.getBounds()
                });
            };


            // Get the player
            var playerPromise = playerService.getDeferredMe();

            /**
             * Sets whether the product list is shown
             * @param {boolean} [show=true]
             */
            vm.showProductList = function(show) {
                if (typeof show === 'undefined') {
                    show = true;
                }
                show = !!show;

                // Update and track if it changed
                if (vm.productShown !== show) {
                    vm.productShown = show;
                    angularPiwik.track('map.productList', show ? 'open' : 'close');
                }
            };

            /**
             * Sets whether the filters are shown
             * @param {boolean} [show=true]
             */
            vm.showFilters = function(show) {
                if (typeof show === 'undefined') {
                    show = true;
                }
                show = !!show;

                // Update and track if it changed
                if (vm.filtersShown !== show) {
                    vm.filtersShown = show;
                    angularPiwik.track('map.filters', show ? 'open' : 'close');
                }
            };

            /**
             * Sets whether the search is shown
             * @param {boolean} [show=true]
             */
            vm.showSearch = function(show) {
                if (typeof show === 'undefined') {
                    show = true;
                }
                show = !!show;

                // Update and track if it changed
                if (vm.searchShown !== show) {
                    vm.searchShown = show;
                    if (vm.searchShown) {
                        // Hide all other boxes
                        // TODO: this should really be done somewhere more central (in it's own component)
                        vm.showProductList(false);
                        vm.showFilters(false);
                        vm.locationSet.abortCreateLocation();
                        vm.locationSet.activate();
                    }
                    angularPiwik.track('map.search', show ? 'open' : 'close');
                }
            };

            /**
             * Goes to the location list
             */
            vm.goToLocationList = function() {
                $location.path('locations/');
            };

            /**
             * Starts creating a new location
             */
            vm.startCreateLocation = function() {
                playerPromise.then(function(player) {
                    vm.locationSet.startCreateLocation(player, vm.map);
                });
            };

            /**
             * Returns the location type to be shown on the product list
             * @returns {string}
             */
            vm.getProductListType = function() {
                // Default is gastronomy
                var type = 'gastronomy';

                // If filter is set to retail, then retail
                if (locationFilterService.activeFilters.type === 'retail') {
                    type = 'retail';
                }

                return type;
            };

            /**
             * Handler for clicks on map markers. This will only ever be called for
             * Locations, because only those are clickable (clusters aren't).
             * @param {Location} locationItem
             */
            vm.onLocationClick = function(locationItem) {
                if (!vm.locationSet.isCreatingLocation() && !locationItem.isDisabled()) {
                    // Run it through $apply since we are coming directly from Leaflet
                    $scope.$apply(function() {
                        vm.locationSet.activate(locationItem);

                        // Track it
                        angularPiwik.track('map.locations', 'map.locations.click');

                        // Hide the product list, filters and search
                        vm.showProductList(false);
                        vm.showFilters(false);
                        vm.showSearch(false);
                    });
                }
                // TODO: if not handled, should pass on the click to the map?
            };

            // Register to map changes
            // We do it directly through leaflet, because watching the center
            // provided from leaflet-directive is buggy in some cases.
            vm.map.on('moveend', informCenterChanged);
            vm.map.on('viewreset', informCenterChanged);

            // Listen to clicks on the map
            vm.map.on('click', function() {
                $scope.$apply(function() {
                    if (!vm.locationSet.isCreatingLocation()) {
                        // When not adding a location, deselect currently active location
                        vm.locationSet.activate();

                        // And hide product list, filters and search
                        vm.showProductList(false);
                        vm.showFilters(false);
                        vm.showSearch(false);
                    }
                });
            });

            // Watch the active filters
            $scope.$watchCollection('mainMapVm.locationFilterService.activeFilters',
                function(filters, filtersBefore) {
                    // Track filter usage
                    if (angular.isDefined(filtersBefore)) {
                        // Note: this also tracks when the filter is changed through the url
                        if (filters.recent !== filtersBefore.recent) {
                            angularPiwik.track('map.filters', 'applyFilter.recent', filters.recent);
                        }
                        if (filters.type !== filtersBefore.type) {
                            angularPiwik.track('map.filters', 'applyFilter.type', filters.type);
                        }
                    }

                    mainMapService.onFiltersChanged();
                }
            );

            // Listen to clicks on search button
            $scope.$onRootScope('veganaut.search.clicked', function() {
                vm.showSearch(!vm.searchShown);
            });

            // When we go away from this page, reset the url and abort adding location
            $scope.$onRootScope('$routeChangeStart', function(event) {
                if (!event.defaultPrevented) {
                    // Remove the search params if the event is still ongoing
                    $location.search('zoom', null);
                    $location.search('coords', null);
                    $location.search('type', null);
                    $location.search('recent', null);

                    // Abort adding a new location
                    vm.locationSet.abortCreateLocation();
                }
            });

            // Finally, initialise the map
            mainMapService.initialiseMap(vm.map);
        }
    ];

    // Expose as directive
    angular.module('veganaut.app.map')
        .controller('vgMainMapCtrl', mainMapCtrl)
        .directive('vgMainMap', [mainMapDirective])
    ;
})();
