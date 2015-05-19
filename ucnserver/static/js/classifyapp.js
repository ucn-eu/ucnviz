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

require(['modules/classify', 'modules/classifytimeline'], function(classify,ctl) {
    classify.init();
    ctl.init();
});
