'use strict';

/* global describe, beforeEach, it, expect, inject, jasmine */
describe('mainMapService.', function() {
    var $location, $rootScope, backendService, localStorage, hash = '', geoIpDeferred;
    beforeEach(module('veganaut.app.map'));

    beforeEach(module(function($provide) {
        // Set up all the mock dependencies
        hash = '';
        $location = {
            hash: jasmine.createSpy('$location.hash').andCallFake(function() {
                return hash;
            }),
            replace: jasmine.createSpy('$location.replace')
        };

        backendService = {
            getGeoIP: jasmine.createSpy('backendService.getGeoIP')
        };

        localStorage = {
            getItem: jasmine.createSpy('getItem'),
            setItem: jasmine.createSpy('setItem')
        };

        $provide.value('$location', $location);
        $provide.value('backendService', backendService);
        $provide.value('$window', {
            localStorage: localStorage
        });
    }));

    beforeEach(inject(function($q, _$rootScope_) {
        geoIpDeferred = $q.defer();
        backendService.getGeoIP.andReturn(geoIpDeferred.promise);
        $rootScope = _$rootScope_;
    }));

    describe('constructor.', function() {
        it('loads the center from the url hash.', function() {
            hash = '46.5,7.3,12';
            inject(function(mainMapService) {
                expect($location.hash).toHaveBeenCalledWith();
                expect(localStorage.getItem).not.toHaveBeenCalled();
                expect(backendService.getGeoIP).not.toHaveBeenCalled();
                expect(mainMapService.center).toEqual({
                    lat: 46.5,
                    lng: 7.3,
                    zoom: 12
                });

                // Stored the value in the local storage and url hash
                expect(localStorage.setItem).toHaveBeenCalledWith('veganautMapCenter', '{"lat":46.5,"lng":7.3,"zoom":12}');
                expect($location.hash).toHaveBeenCalledWith('46.5000000,7.3000000,12');
            });
        });

        it('loads the center from local storage if url hash is empty.', function() {
            localStorage.getItem.andReturn('{"lat":10.5, "lng": 20.1, "zoom": 3}');
            inject(function(mainMapService) {
                expect(localStorage.getItem).toHaveBeenCalledWith('veganautMapCenter');
                expect(backendService.getGeoIP).not.toHaveBeenCalled();
                expect(mainMapService.center).toEqual({
                    lat: 10.5,
                    lng: 20.1,
                    zoom: 3
                });

                expect(localStorage.setItem).toHaveBeenCalledWith('veganautMapCenter', '{"lat":10.5,"lng":20.1,"zoom":3}');
                expect($location.hash).toHaveBeenCalledWith('10.5000000,20.1000000,3');
            });
        });

        it('loads the center from backend if local storage and url hash are empty.', function() {
            inject(function(mainMapService) {
                expect(localStorage.getItem).toHaveBeenCalledWith('veganautMapCenter');
                expect(backendService.getGeoIP).toHaveBeenCalled();
                expect(mainMapService.center).toEqual({
                    lat: 0,
                    lng: 0,
                    zoom: 2
                }, 'sensible default before backend returns');

                // Didn't save the default value
                expect(localStorage.setItem).not.toHaveBeenCalled();

                geoIpDeferred.resolve({
                    data: {
                        lat: 15.2,
                        lng: 22.5
                    }
                });
                $rootScope.$apply();

                expect(mainMapService.center).toEqual({
                    lat: 15.2,
                    lng: 22.5,
                    zoom: 10
                }, 'takes values from backend');

                expect(localStorage.setItem).toHaveBeenCalledWith('veganautMapCenter', '{"lat":15.2,"lng":22.5,"zoom":10}');
                expect($location.hash).toHaveBeenCalledWith('15.2000000,22.5000000,10');
            });
        });

        it('ignores faulty values.', function() {
            hash = 'bla';
            localStorage.getItem.andReturn('{"lat": "test", "lng": false, "zoom": 3}');
            inject(function(mainMapService) { // jshint ignore:line
                expect($location.hash).toHaveBeenCalledWith();
                expect(localStorage.getItem).toHaveBeenCalled();
                expect(backendService.getGeoIP).toHaveBeenCalled();
            });
        });
    });

    describe('setMapCenterFromUrl.', function() {
        it('method exists.', inject(function(mainMapService) {
            expect(typeof mainMapService.setMapCenterFromUrl).toBe('function');
        }));

        it('reads the center from the url.', inject(function(mainMapService) {
            hash = '1,2,3';
            mainMapService.setMapCenterFromUrl();
            expect(mainMapService.center).toEqual({
                lat: 1,
                lng: 2,
                zoom: 3
            });

            expect(localStorage.setItem).toHaveBeenCalledWith('veganautMapCenter', '{"lat":1,"lng":2,"zoom":3}');
            expect($location.hash).toHaveBeenCalledWith('1.0000000,2.0000000,3');
        }));

        it('ignores faulty values.', inject(function(mainMapService) {
            mainMapService.center = {
                lat: 1,
                lng: 2,
                zoom: 3
            };

            hash = 'a,b,c';
            mainMapService.setMapCenterFromUrl();
            expect(mainMapService.center).toEqual({
                lat: 1,
                lng: 2,
                zoom: 3
            });
            expect(localStorage.setItem).not.toHaveBeenCalled();

            hash = '10,20';
            mainMapService.setMapCenterFromUrl();
            expect(mainMapService.center).toEqual({
                lat: 1,
                lng: 2,
                zoom: 3
            });
            expect(localStorage.setItem).not.toHaveBeenCalled();
        }));
    });

    describe('saveCenter.', function() {
        it('method exists.', inject(function(mainMapService) {
            expect(typeof mainMapService.saveCenter).toBe('function');
        }));

        it('saves to local storage and url hash.', inject(function(mainMapService) {
            mainMapService.center = {
                lat: 7.1234567890123,
                lng: 2.123456789012,
                zoom: 15
            };

            mainMapService.saveCenter();
            expect(localStorage.setItem).toHaveBeenCalledWith('veganautMapCenter', '{"lat":7.1234567890123,"lng":2.123456789012,"zoom":15}');
            expect($location.hash).toHaveBeenCalledWith('7.1234568,2.1234568,15');
        }));
    });
});