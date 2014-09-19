window._mapsLoaded = $.Deferred();
window.gmapsLoaded = function(data) {
  delete window.gmapsLoaded;
  _mapsLoaded.resolve();
};

define(["https://maps.google.com/maps/api/js?v=3&libraries=drawing&sensor=false&callback=gmapsLoaded"], function(gmaps) {
  "use strict";

  return window._mapsLoaded.done;
});