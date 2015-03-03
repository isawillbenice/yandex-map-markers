define('yandex-map-markers', [
    'domReady',
    'jquery',
    'underscore',
    'backbone',
    'yandex-map-api'
], function (domReady, $, _, Backbone, YandexMapApi) {
    'use strict';

    console.log('%cfile: yandex-map-markers.js', 'color: #C2ECFF');

    var self;
    var router;
    var Deferred = $.Deferred();
    var __dataLoaded = false;
    var map_options = {
        default_options: {
            center: [55.751574, 37.573856],
            zoom: 10,
            controls: []
        },

        markers_options: {
            iconImageHref: '../../images/marker.png'
        },

        controls_types: {
            zoomControl : { right: "8px", top: "125px" },
            fullscreenControl : { right: "8px", top: "15px" }
        }
    };

    //Шаблон для балуна
    var __balloonTemplate = function() {
        self.marker_balloon_layout = ymaps.templateLayoutFactory.createClass(
            '<div class="baloon-content">' +
            '<div class="baloon-title">$[properties.name]</div>' +
            '<div class="baloon-region">$[properties.region], $[properties.city]</div>' +
            '<div class="baloon-address">$[properties.address]</div>' +
            '</div>'
        );
        ymaps.layout.storage.add('map#marker_balloon_layout', self.marker_balloon_layout);
    };

    //Добавление меток в objectManager
    var __addMarkers = function() {
        self.objectManager.add(self.markers_data);
    };

    //Выбрать адрес
    var __select_address = function(id) {
        var finded_item = __findObjectInObjectManager(id);
        __viewSurroundingCities(finded_item);

        var address_full;

        if(finded_item.city == 'г. Москва') {
            address_full = 'Россия, ' + finded_item.city;
        } else {
            address_full = 'Россия, ' + finded_item.region + ', ' + finded_item.city;
        }

        self.setCenterByAddress(address_full);

        $('.js__select-address').removeClass('active');
        $('.js__select-address[data-id= "'+ id + '"]').addClass('active');

        return false;
    };

    //Отрисовать ближайшие города и текущий город
    var __viewSurroundingCities = function(item) {
        var templateSurroundingCitiesItem = _.template($('#js__surrounding-cities-item-template').html()),
            contentSurroundingCities = '';

        var surrounding_cities = __findSurroundingCities(item.region, item.city);

        _.each(surrounding_cities, function(item){
            contentSurroundingCities += templateSurroundingCitiesItem(item);
        });

        var city = item.city;
        city = city.replace('г. ', '');
        $('.js__current_city').html(city);
        $('.js__surrounding_cities').html(contentSurroundingCities);
    };

    //Найти объект в objectManager
    var __findObjectInObjectManager = function(id) {
        var finded = self.objectManager.objects.getById(id);

        if(!finded) {
            return false;
        }

        var finded_item = {
            id: finded.properties.id,
            region: finded.properties.region,
            city: finded.properties.city,
            name: finded.properties.name,
            description: finded.properties.description
        };

        return finded_item;
    };

    //Найти ближайшие города к выбраному городу
    var __findSurroundingCities = function(region, city) {
        var surrounding_cities = [];

        self.objectManager.objects.each(function(object) {
            if(object.properties.region == region && object.properties.city != city) {
                surrounding_cities.push(object.properties);
            }
        });

        surrounding_cities = _.uniq(surrounding_cities, function(el) {
            return el.city;
        });

        return surrounding_cities;
    };

    //Загрузка данных для меток
    var __dataLoader = function __dataLoader(){
        $.ajax({
            url: '/json/data.json',
            data: {},
            success: function(data){
                console.log('%ctrace: Map -> ajax', 'color: #ccc');

                self.markers_data = data;
                ymaps.ready(function() {
                    self.initialize();
                    __dataLoaded = true;
                    Deferred.resolve();
                });
            },
            dataType: 'json'
        });

        return Deferred.promise();
    };

    function Map(map_id, options) {
        console.log('%ctrace: Map -> constructor', 'color: #ccc');

        self = this;
        self.map_id = map_id;
        self.options = options;

        if($('#' + self.map_id).length <= 0){
            console.warn('%ctrace: Map: not found dom elements', 'color: #ccc');
            return false;
        }

        new YandexMapApi();

        self.init_routes();

        if(!window.location.hash){
            __dataLoader();
        }
    }

    Map.prototype = {
        initialize: function() {
            console.log('%ctrace: Map -> initialize', 'color: #ccc');

            self.init_map();
            self.init_ballon_template();
            self.init_map_controls();
            self.init_my_controls();
            self.init_object_manager();
            self.add_markers();

            if(!window.location.hash){
                self.geolocation();
            }

            self.getVisibleMarkers();
        },

        //Инициализация карты
        init_map: function() {
            var init_options = $.extend({}, map_options.default_options, self.map_id);
            self.map = new ymaps.Map(
                self.map_id,
                init_options
            );

            self.map.behaviors.disable('scrollZoom');
        },

        //Инициализация ObjectManager
        init_object_manager: function() {
            self.objectManager = new ymaps.ObjectManager({
                clusterize: true,
                geoObjectPreset: 'islands#greenDotIcon',
                geoObjectBalloonContentLayout: self.marker_balloon_layout,
                geoObjectBalloonMaxWidth: 505,
                geoObjectBalloonMaxHeight: 215,
                geoObjectHideIconOnBalloonOpen: false,
                geoObjectIconLayout: 'default#image',
                geoObjectIconImageHref: map_options.markers_options.iconImageHref,
                geoObjectIconImageSize: [36, 36],
                geoObjectIconImageOffset: [-18, -18],
                clusterBalloonContentLayout: 'cluster#balloonCarouselContent',
                clusterBalloonItemContentLayout: self.marker_balloon_layout,
                clusterBalloonMaxWidth: 505,
                clusterBalloonMaxHeight: 215,
                clustergroupByCoordinates: false,
                clusterDisableClickZoom: false,
                clusterHideIconOnBalloonOpen: false
            });

            self.map.geoObjects.add(self.objectManager);
        },

        //Инициализация элементов урпавления для карты
        init_map_controls: function() {
            for (var control in map_options.controls_types) {
                self.map.controls.add(control, {
                    float: 'none',
                    position: map_options.controls_types[control]
                });
            }
        },

        //Инициализация дополнительных элементов управления
        init_my_controls: function() {
            self.map.events.add(['boundschange','datachange','objecttypeschange'], function(e){
                self.getVisibleMarkers();
            });

            $('body').on('click', '.js__show-all-addresses', _.bind(self.showAllAddresses, self));
            $('body').on('click', '.js__show-main-addresses', _.bind(self.showMainAddresses, self));
            $('body').on('click', '.js__select-optics', _.bind(self.selectOptics, self));
        },

        //Инициализация шаблона для балунов
        init_ballon_template: function() {
            __balloonTemplate();
        },

        init_routes: function() {
            console.log('%ctrace: Map -> init_routes', 'color: #ccc');

            var Router = Backbone.Router.extend({
                routes: {
                    'city/:id': 'select_address'
                }
            });

            router = new Router();

            router.on('route:select_address', function (id) {
                if(__dataLoaded){
                    __select_address(id);
                    return true;
                }

                __dataLoader().done(function() {
                    __select_address(id);
                });
            });
        },

        //Добавление меток на карту
        add_markers: function() {
            __addMarkers();
        },

        //Получит видимые метки
        getVisibleMarkers: function() {
            var result = ymaps.geoQuery(self.objectManager.objects).searchInside(self.map);
            result.then(function () {
                self.showOptics(result);
            });
        },

        //Центрирование по адресу
        setCenterByAddress: function(address) {
            ymaps.geocode(address, {
                results: 1,
                kind: 'locality'
            }).then(function (res) {
                var firstGeoObject = res.geoObjects.get(0),
                    bounds = firstGeoObject.properties.get('boundedBy');

                self.map.setBounds(bounds, {
                    checkZoomRange: true
                });
            });
        },

        //Геолокация
        geolocation: function() {
            var geolocation = ymaps.geolocation;
            geolocation.get({
                provider: 'auto',
                autoReverseGeocode: true
            }).then(function (res) {
                var firstGeoObject = res.geoObjects.get(0),
                    bounds = firstGeoObject.properties.get('boundedBy');

                self.map.setBounds(bounds, {
                    checkZoomRange: true
                });

                var id = ymaps.geoQuery(self.objectManager.objects).getClosestTo(firstGeoObject).properties.get('id');
                var finded_item = __findObjectInObjectManager(id);
                __viewSurroundingCities(finded_item);

                var city = finded_item.city;
                city = city.replace('г. ', '');

                $('.js__select-address').removeClass('active');

                $('.js__select-address').each(function() {
                    if($(this).children().text() == city) {
                        $(this).addClass('active');
                    }
                });
            });
        },

        //Показать оптику
        showOptics: function(optics) {
            var i = 1,
                templateOpticsItem = _.template($('#js__optics__item-template').html()),
                contentOptics = '';

            optics.each(function(optic) {
                var item = {
                    id: optic.properties.get('id'),
                    name: optic.properties.get('name'),
                    region: optic.properties.get('region'),
                    city: optic.properties.get('city'),
                    address: optic.properties.get('address'),
                    description: optic.properties.get('description'),
                    i: i
                };

                i++;
                contentOptics += templateOpticsItem(item);
            });

            $('.js__optics').html(contentOptics);
        },

        //Показать все адреса (города)
        showAllAddresses: function() {
            $('.js__all-addresses').css('display', 'block');
            $('.js__main-addresses').css('display', 'none');
            return false;
        },

        //Показать главные адреса (города)
        showMainAddresses: function() {
            $('.js__all-addresses').css('display', 'none');
            $('.js__main-addresses').css('display', 'block');
            return false;
        },

        //Выбрать адрес (город)
        selectAddress: function(e) {
            var $el = $(e.currentTarget),
                $id = $el.attr('data-id');

            __select_address($id);

            return false;
        },

        //Выбрать оптику
        selectOptics: function(e) {
            var $el = $(e.currentTarget),
                $id = $el.attr('data-id');

            var finded = self.objectManager.objects.getById($id);
            var coord = finded.geometry.coordinates;

            self.map.setCenter(coord, 17)
                .then(function () {
                    setTimeout(function() {
                        var objectState = self.objectManager.getObjectState($id);
                        // Проверяем, находится ли объект в видимой области карты.
                        if (objectState.isShown) {
                            // Если объект попадает в кластер, открываем балун кластера с нужным выбранным объектом.
                            if (objectState.isClustered) {
                                self.objectManager.clusters.state.set('activeObject', finded);
                                self.objectManager.clusters.balloon.open(objectState.cluster.id);
                            } else {
                                // Если объект не попал в кластер, открываем его собственный балун.
                                self.objectManager.objects.balloon.open($id);
                            }
                        }
                    }, 300);
                });

            return false;
        }
    };

    return Map;
});
