require.config({
        baseUrl: '/static/js/my',
        paths:{
	  	    "d3":"../d3/d3.min",
          "jquery" : "../jquery/jquery-2.1.0.min",
          "knockout" : "../knockout/knockout-3.1.0",
          "knockoutpb": "../knockout/knockout-postbox",
          'moment': '../moment/moment.min',
        },
        shim: {
        	"knockout"	: ['jquery'],
        }
});

require(['knockout','modules/classify', 'modules/classifytimeline','modules/classifysummary','modules/classifytitle'], function(ko,classify,ctl,cs,ct) {
    classify.init();
    ctl.init();
    ko.applyBindings(cs, $("#summary")[0]);
    ko.applyBindings(ct, $("#title")[0]);
});
