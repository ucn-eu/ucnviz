define(['jquery','knockout', 'ajaxservice'], function($, ko, ajaxservice){

    var
       	self = this,
       	
       	pSentimentLabels = {1: "absence of anything positive",
       						2: "some weak positive elements of generic ethusiasm without negative slant (e.g) hey!",
       						3: "clear positive elements of messages (includes fun, happiness, optimism, positive evaluations, love",
       						4: "overwhelmingly positive or several positive elements or some emphasis of positive elements",
       						5: "enthusiastically positive (e.g. I am very happy!!!!)"
       						},
       	
       	nSentimentLabels = {1: "absence of anything negative",
       						2: "some negative elements (e.g a casual 'miss you')",
       						3: "clear negative elements of message",
       						4: "overwhelmingly negative or several negative elements or some emphasis of negative elements",
       						5: "definitely negative (e.g. this is totally shit)"},
       	
       	topicindex 	 = 0,
       	
       	datasource	= ko.observable(),
       
       	topics		= ko.observableArray([{}]),
       	
       	topic		= ko.observable(topics()[topicindex]),
       	
       	selectedCategories = ko.observableArray([]),
       	
       	selectedNSentiment = ko.observable({}),
       	
       	selectedPSentiment = ko.observable({}),
       	
       	selectedChildren	 = ko.observableArray([]),
       	
        children = ko.observableArray([]),
       	
       	categories  = ko.observableArray([]),
       	
       	notes		= ko.observable(""),
       	
       	catdata = [
       										/*information*/
       										{"id": 1, "name": "advice sought",  "children":["appliances", "broadband", "tv", "legal", "boiler", "energy", "service charge", "lease", "condensation", "transport", "insurance", "buzzer", "renovation", "interior", "aircon", "area/living", "flood", "disposal", "business" /* specific business names*/, "cleaner", "noise", "balcony doors", "property plans", "pigeons", "rental prices", "communication", "source product"]}, 
       										{"id": 2, "name":"help sought", "children":["expertise", "borrow", "original fixtures/fittings", "restoration"]},
       										{"id": 3, "name": "advice offered", "children":["broadband", "tv", "legal", "boiler", "plumbing", "energy", "service charge", "lease", "condensation", "transport", "smoke alarms", "property prices", "insurance", "antisocial", "recycling", "concessions/discounts", "management"]}, 
       										/* general recommendations sought */
       										{"id": 4,"name": "local business", "children":["supermarket", "restaurant", "carpenter", "tradesman", "plumber", "window cleaner", "shop", "pub", "school", "solicitors", "plasterer", "doctor", "mechanic", "dentist", "childcare", "roofer", "flooring", "gym", "balcony doors", "electrician", "cleaner", "carpet cleaner", "handyman", "dog walker", "man with van"]},
       										
       										{"id": 5, "name": "warning", "children":["scam", "mugging", "suspicious individual(s)", "maintenance", "business", "driving penalties", "road closure", "fire"]},
       										{"id": 6, "name": "antisocial", "children":["drugs",  "drink", "intimidation", "fight", "dogs", "prostitution", "theft","crime", "youths", "graffiti", "litter",  "fly tipping", "noise", "fellow residents", "vandalism", "cars", "shopping trolleys", "trespassing", "break in"]},
       										{"id": 7, "name": "living", "children":["noise", "lights", "smell", "cats", "wildlife", "cold callers", "quality of life/environment", "junk mail", "post" ]},
       										{"id": 8,"name": "local area", "children":["event", "supermarket", "market", "planning", "licences","restaurant", "construction", "plumber", "shop", "pub", "school", "solicitors", "gossip", "parking", "request for info", "sports facilities"]},
       										{"id": 9,"name": "local incident", "children":["fire", "accident", "request for info", "request for witnesses", "eviction"]},
       										/* governance */
       										{"id": 10, "name": "rules", "children":["rental", "balcony", "parking", "bbq", "airbnb", "improvements", "access", "recycling", "smoking", "enforcement request", "enforcement advice", "procedural advice", "animals"]},
       										{"id": 11, "name": "legal", "children":["LVT", "lease", "dispute", "AGM", "freehold", "clause breach", "invoke rights", "threat"]},
       										{"id": 12, "name": "media", "children":["related"]},
       										{"id": 13, "name": "action", "children":["broadband", "mp", "planning", "councillor", "management company", "service charges", "freeholder", "neighbourhood watch", "policing", "community funds", "community building", "charity", "pool resources", "pressure", "reporting", "claim", "petition"]},
       								
       										/*social*/
       										{"id": 14, "name": "social", "children":["introduction", "event", "sports", "club", "history", "drink", "party", "children", "car share", "gossip", "game", "borrow", "pictures", "walking", "conservation", "freebies", "shared interest", "banter"]},
       										
       										/*property management*/
       										{"id": 15, "name": "management", "children":["meeting","report","request", "ground rent", "service charge", "lease", "communication", "residents association", "proposal", "contact details", "council", "culpablility", "request for comment", "request for disclosure"]},
       										{"id": 16, "name": "staff", "children": ["concierge", "security", "cleaner", "maintenance", "builders", "gardeners", "caretaker"]},
       										{"id": 17, "name": "management company", "children":["service charge", "performance", "trust", "project", "tender", "comparison", "specific responsibility" /*(who is who?)*/, "contracts"]},
       										{"id": 18, "name": "property issue", "children":["security", "access", "insulation", "intercom", "windows", "balcony doors", "heating", "parking", "grounds", "stairs", "lift", "roof", "corridors", "doors", "gates", "floors", "gym", "balcony", "cctv", "rubbish","water", "fire alarm", "decoration", "drains", "health/safety", "pests/infestations", "mould", "damp", "crime prevention", "design", "lighting", "walls","ceiling", "carpets", "meters", "works", "guttering", "notice board", "bin"]},
       										
       										/*commerce & finance*/
       										{"id": 19,"name": "commerce", "children":["property rental", "property sale", "service offered", "service sought", "prospective buyer", "parking", "storage", "for sale"]},
       										{"id": 20,"name": "finance", "children":["council tax", "service charges", "water meter", "equity release", "mortgage"]},
       										
       										/*website*/
       										{"id": 21,"name": "website", "children":["hack", "spam", "about", "input", "complaint", "observation", "moderation", "issue", "close", "functionality question", "role", "content request", "audience numbers"]},
       										
       										
       										{"id": -1,"name": "+", "children":[]}
       									
       									];	
       							
       									
       	psentiment	= ko.observableArray([{"id":1, "name":"1 (none)"},
       									 {"id":2, "name":"2 (weak positive elements)"},
       									 {"id":3, "name":"3 (clear positive elements)"},
       									 {"id":4, "name":"4 (overwhelmingly positive)"},
       									 {"id":5, "name":"5 (enthusiastically positive)"},
       									]),
       	
       	
       	nsentiment = ko.observableArray([{"id":1, "name":"1 (none)"},
       									 {"id":2, "name":"2 (some negative elements)"},
       									 {"id":3, "name":"3 (clear negative elements)"},
       									 {"id":4, "name":"4 (overwhelmingly negative)"},
       									 {"id":5, "name":"5 (definitely negative)   "},
       									]),
		//attach observables..
		
		anon = function(){
			
       		catdata.forEach(function(item){
       			item.selected = ko.computed(function(){
       				return selectedCategories().indexOf(item) > -1;		
       			});
       			item.children = ko.observableArray(item.children);
       			categories.push(item);
       		});
       		nsentiment().forEach(function(item){
       			item.nselected = ko.computed(function(){
       				return item.id== selectedNSentiment().id
       			});
       		});
       		psentiment().forEach(function(item){
       			item.pselected = ko.computed(function(){
       				return item.id == selectedPSentiment().id
       			});
       		});
       	}(),	
       	
		nSentimentSummary = ko.computed(function(){
			if (selectedNSentiment()){
				return nSentimentLabels[selectedNSentiment().id];
			}
			return "";
		}),
		
		pSentimentSummary = ko.computed(function(){
			if (selectedPSentiment()){
				return pSentimentLabels[selectedPSentiment().id];
			}
			return "";
		}),
		
		tlen = ko.computed(function(){
			return topics().length;	
		}),
		
		updateAnnotations = function(){
			console.log("0. in here....update annotations");
			selectedCategories([]);
			selectedChildren([]);
			selectedNSentiment(0);
       		selectedPSentiment(0);
       		notes("");
       		
			if (topic().category){
				catarray = topic().category.split(",");
				
				for (i = 0; i < catarray.length; i++){
					cname = catarray[i];
					cat = $.grep(categories(), function(e){return e.name == cname});
				
					if (cat && cat.length > 0){
						if (selectedCategories().indexOf(cat) <= -1){
							selectedCategories.push(cat[0]);
							children(cat[0].children());
						}
					}
				}
			}	
		
			if (topic().subcategory){
				carray = topic().subcategory.split(",");
				for (i = 0; i < carray.length; i++){  
					selectedChildren.push(carray[i]);
				}
			}
			if (topic().nsentiment){
				console.log(topic().nsentiment);
				sentiment = $.grep(nsentiment(), function(e){return e.id == topic().nsentiment});
				selectedNSentiment(sentiment[0])
			}
			if (topic().psentiment){
				console.log(topic().psentiment);
				sentiment = $.grep(psentiment(), function(e){return e.id == topic().psentiment});
				selectedPSentiment(sentiment[0])
			}	
			if (topic().notes){
				notes(topic().notes);
			}
		},
		
		
		completed = ko.computed(function(){
			return selectedPSentiment() != 0 && selectedNSentiment() != 0 && selectedCategories().length > 0 && selectedChildren().length > 0;
		}),
		
		completedText = ko.computed(function(){
			if (completed())
				return "completed";
			return "incomplete";
		}),
		
		gottopics = function(data){
			topics(data.topics);
			topic(topics()[topicindex]);
			updateAnnotations();
			console.log(topic());
		},
		
		
		postedcat = function(data){
			topic().category = data.topic.category;
			topic().subcategory = data.topic.subcategory;
			topic().psentiment = data.topic.psentiment;
			topic().nsentiment = data.topic.nsentiment;
			topic().notes	 = data.topic.notes;
			topicindex = ++topicindex % topics().length;
       		topic(topics()[topicindex]);
       		updateAnnotations();
		},
		
		init = function(){
			 ajaxservice.ajaxGetJson('topics', {} , gottopics);
       	},
       	
       	next = function(){
       		if (completed()){
       			//send just the names of categories
       			names = [];
       			for (i = 0; i < selectedCategories().length; i++){
       				names.push(selectedCategories()[i].name);
       			}
       			ajaxservice.ajaxPostJson('annotate', {
       						"tid": topic().tid, 
       						"psentiment":selectedPSentiment().id, 
       						"nsentiment":selectedNSentiment().id, 
       						"category":names.join(), 
       						"subcategory":selectedChildren().join(),
       						"notes":notes()} , postedcat);
       		}else{
       			postedcat({});
       		}
       	},
       	
       	previous = function(){
       		if (topicindex >= 1){
       			topicindex--;
       			topic(topics()[topicindex]);
       		}
       		updateAnnotations();
       	},
       	
       	isChildSelected = function(child){
       		return selectedChildren().indexOf(child) > -1;
       	},
       	
       	setChildSelected = function(child){
       		if (selectedChildren().indexOf(child) > -1){
       			selectedChildren.remove(child);
       		}else{
       			selectedChildren.push(child);
       		}
       	},
       	
       	//setters and getters for category
		setCategorySelected = function(category){
			if (selectedCategories().indexOf(category) > -1){
				selectedCategories.remove(category);	
			}else{
				selectedCategories.push(category);	
				children(category.children());
			}
			
		},
		
		//setters and getters for sentiment
		setNSentimentSelected = function(sentiment){
			selectedNSentiment(sentiment);	
		},
		
		setPSentimentSelected = function(sentiment){
			selectedPSentiment(sentiment);	
		},
	
		isPSentimentSelected = function(sentiment){
			return sentiment.id == selectedPSentiment().id
		},
		
		isNSentimentSelected = function(sentiment){
			return sentiment.id == selectedNSentiment().id
		}

    return {
    	tlen: tlen,
    	init: init,
    	gottopics: gottopics,
    	postedcat: postedcat,
    	topic: topic,
    	next: next,
    	previous: previous,
    	psentiment:psentiment,
    	nsentiment:nsentiment,
    	children:children,
    	categories: categories,
	
    	setCategorySelected: setCategorySelected,
    	//isCategorySelected: isCategorySelected,
    	
    	selectedCategories: selectedCategories,
    	selectedChildren: selectedChildren,
    	setChildSelected: setChildSelected,
    	isChildSelected: isChildSelected,
    	
        setPSentimentSelected: setPSentimentSelected,
        setNSentimentSelected: setNSentimentSelected, 
        isPSentimentSelected: isPSentimentSelected,
        isNSentimentSelected: isNSentimentSelected,  
        
        nSentimentSummary : nSentimentSummary,  
        pSentimentSummary : pSentimentSummary,  
        
        notes: notes,
        
        completed: completed,
        completedText: completedText,
    }
});

