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
    var mainMapCtrl = [
        '$scope', '$location', 'leafletData', 'angularPiwik', 'mapDefaults',
        'playerService', 'locationService', 'locationFilterService', 'mainMapService',
        function($scope, $location, leafletData, angularPiwik, mapDefaults,
            playerService, locationService, locationFilterService, mainMapService) {
            var vm = this;

            // Expose the global methods we still need
            // TODO: find a better way to do this
            vm.legacyGlobals = {
                goToView: $scope.$parent.goToView,
                isLoggedIn: $scope.$parent.isLoggedIn,
                isEmbedded: $scope.$parent.isEmbedded,
                getLogoUrl: $scope.$parent.getLogoUrl
            };

            // Expose map settings and filter service
            vm.mainMap = mainMapService;
            vm.locationFilterService = locationFilterService;

            /**
             * Leaflet map settings
             * @type {{}}
             */
            vm.mapDefaults = mapDefaults;

            /**
             * Reference to the leaflet map object
             * @type {{}}
             */
            vm.map = undefined;

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

            // Get a reference the the leaflet map object
            var mapPromise = leafletData.getMap();
            mapPromise.then(function(map) {
                vm.map = map;
            });

            // Get the player
            var playerPromise = playerService.getDeferredMe();


            /**
             * Queries for locations within the current map bounds.
             */
            var reloadLocations = function() {
                // Reload locations
                // TODO WIP: this is called way to often (different watchers)
                mapPromise.then(function(map) {
                    // Get the bounds and zoom level of the map and query the locations
                    locationService.queryByBounds(map.getBounds().toBBoxString(), map.getZoom());
                });
            };

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
                // Get size of the header (main nav bar and map nav) in pixels
                // TODO: isEmbedded should come from a service and the header size probably too
                var headerSize = 46;
                if (!vm.legacyGlobals.isEmbedded) {
                    headerSize += 50;
                }
                mainMapService.goToLocationList(headerSize);
            };

            /**
             * Starts creating a new location
             */
            vm.startCreateLocation = function() {
                mapPromise.then(function(map) {
                    playerPromise.then(function(player) {
                        vm.locationSet.startCreateLocation(player, map);
                    });
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

            // Listen to clicks on the map
            $scope.$on('leafletDirectiveMap.click', function() {
                if (!vm.locationSet.isCreatingLocation()) {
                    // When not adding a location, deselect currently active location
                    vm.locationSet.activate();

                    // And hide product list, filters and search
                    vm.showProductList(false);
                    vm.showFilters(false);
                    vm.showSearch(false);
                }
            });

            // Watch the map center for changes to save it
            $scope.$watchCollection('mainMapVm.mainMap.center', function() {
                // Save the center (will also update the url)
                mainMapService.saveCenter();

                // Reload locations
                reloadLocations();
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

                    // Reload locations (will apply new filters)
                    reloadLocations();

                    // Update the url with the new filter value
                    mainMapService.updateUrl();
                }
            );

            // Listen to clicks on search button
            $scope.$onRootScope('veganaut.search.clicked', function() {
                vm.showSearch(!vm.searchShown);
            });

            // Listen to location changes to update the map settings
            // (if the user changes the hash manually)
            $scope.$onRootScope('$locationChangeSuccess', function() {
                mainMapService.setMapFromUrl();
            });

            // When we go away from this page, reset the url and abort adding location
            $scope.$onRootScope('$routeChangeStart', function(event) {
                if (!event.defaultPrevented) {
                    // Remove the hash if the event is still ongoing
                    $location.hash(null);

                    // Abort adding a new location
                    vm.locationSet.abortCreateLocation();
                }
            });
        }
    ];

    // Expose as directive
    angular.module('veganaut.app.map')
        .controller('vgMainMapCtrl', mainMapCtrl)
        .directive('vgMainMap', [mainMapDirective])
    ;
})();
