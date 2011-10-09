/*    _____                    _____          
     /\    \                  /\    \         
    /::\    \                /::\    \        
    \:::\    f\              /::::\    \       
     \:::\    \            /::::::\    \      
      \:::\    \          /:::/\:::\    \     
       \:::\    \        /:::/  \:::\    \    
       /::::\    \      /:::/    \:::\    \   
      /::::::\    \    /:::/    / \:::\    \  
     /:::/\:::\    \  /:::/    /   \:::\    \ 
    /:::/  \:::\____\/:::/____/     \:::\____\
   /:::/    \::/    /\:::\    \      \::/    /
  /:::/    / \/____/  \:::\    \      \/____/ 
 /:::/    /            \:::\    \             
/:::/    /              \:::\    \            
\::/    /                \:::\    \           
 \/____/                  \:::\    \          
                           \:::\    \         
                            \:::\____\        
                             \::/    /        
                              \/____/         
                             TYPE/CODE        
                         From 2010 till ∞     */


(function(window, $) {
	
	var NI = window.NI,
	    field;
	
	field = {
		extensions: {} // hint, validation, autocomplete, etc (TODO)
	};
	
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
// constants
	
	field.co = {
		
		BASE_CLASS: "tc-field",
		LABEL_CLASS: "tc-field-label",
		
		ACTIVE_CLASS: "state-active",
		DISABLED_CLASS: "state-disabled",
		EMPTY_CLASS: "state-empty",
		OPEN_CLASS: "state-open",
		
		VALUE: "data-value",
		TEXT: "data-text"
	};

//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
// utils, factories, etc

	field.get_display_text = function($f) {
		return $f.attr(field.co.TEXT) ? 
			$f.attr(field.co.TEXT) : $f.text();
	};
	
	// synthesize a new field type
	field.synthesize = function(options) {
		var o = $.extend({
			name: null,
			props: null, // static
			base: field._Base,
			proto: {}
		}, options);

		field[o.name] = function(user_options) {
			this._name = o.name;
			this._base = o.base.prototype;
			
			this.$c = null;
			this.elements = {};
			this.events = {};
			this.internal = {
				o: $.extend(
					(this.options || {}), 
					(o.base.prototype.options || {}), 
					user_options)
			};
			
			this._init();
			return this;
		};
		field[o.name].prototype = $.extend({}, o.base.prototype, o.proto);
		
		if (o.props && typeof o.props === "object") {
			$.each(o.props, function(k, v) {
				field[o.name][k] = v;
			});
		}

		return field[o.name];
	};
	
	// field factory
	field.create = function(options) {
		var o, $f, $c, field_type;
		
		o = $.extend({
			selector: null,
			options: {}
		}, options);
		
		$f = o.selector instanceof $ ? o.selector : $(o.selector);
		if (!$f.length) {
			throw new Error("Missing field element");
		}
		
		if ($f.hasClass(field.co.BASE_CLASS)) {
			$c = $f;
			
			if ($c.hasClass(field.Dropdown.container_class)) {
				field_type = "Dropdown";
			}
			
		} else {
			
			if ($f.parent().hasClass(field.co.BASE_CLASS)) {
				$c = $f.parent();
			} else {
				$c = $("<div class='"+ field.co.BASE_CLASS +"'></div>");
				$f.wrap($c);
			}
			
			switch ($f[0].nodeName.toLowerCase()) {
				case "input":
					switch ($f.attr("type").toLowerCase()) {
						case "text":
							field_type = "TextInput";
							break;
						case "password":
							field_type = "Password";
							break;
						case "radio":
							field_type = "Radio";
							break;
						case "checkbox":
							field_type = "Checkbox";
							break;
					}
					break;
				case "textarea":
					field_type = "TextArea";
					break;
				case "select":
					field_type = "Select";
					break;
			}
		}
		
		if (!field_type) {
			field_type = "_Base";
		}
		
		return new field[field_type]($.extend(o.options, {$c: $c}));
	};
		
//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
// base field

// all field types inherit from _Base
	
	field.synthesize({
		name: "_Base",
		
		base: {},
		proto: {
			
			options: {
				$c: null,
				val: null,
				label: null,
				handlers: null,
				event_data: null,
				extensions: null
			},
			
			_init: function() {

				this[this.internal.o.$c ? "generate_from_dom" : "generate_from_scratch"](this.internal.o);
				
				if (this.internal.o.handlers) {
					this.add_handlers(this.internal.o.handlers, this.internal.o.event_data || {me: this});
				}

				if (this.internal.o.extensions) {
					this.apply_extensions(this.internal.o.extensions);
				}

				if (this.internal.o.val) {
					this.set_val(this.internal.o.val, true);
				}
			},

			// (chainable)
			apply_extensions: function(extensions) {
				var me = this;
				$.each(extensions, function(extension, options) {
					if ($.isFunction(field.extensions[extension])) {
						me.internal[extension] = new field.extensions[extension](me, options);
					}
				});
				return this;
			},

			generate_from_dom: function(options) {
				this.$c = options.$c.addClass(field.co.BASE_CLASS);
			},

			generate_from_scratch: function(options) {},

			// (chainable)
			append_to: function() {
				if (!NI.ex.isHeadless(this.$c)) {
					this.$c = this.$c.detach();
				}

				if (typeof arguments[0] === "string") {
					$(arguments[0]).append(this.$c);
				} else if (arguments[0] instanceof $) {
					arguments[0].append(this.$c);
				}

				return this;
			},

			get_val: function() {
				return null;
			},

			// (chainable)
			set_val: function(val, prevent_change) {
				var from, to;
				from = this.get_val();

				if (this._set_val(val) !== false) {
					if (!prevent_change) {
						to = this.get_val();
						if (from !== to) {
							this.$c.trigger("change", {
								from: from,
								to: to
							});
						}
					}
				}

				return this;
			},

			_set_val: function(val) {},

			// (chainable)
			bind: function(type, data, fn, replace) {
				if (replace) {
					this.$c.unbind(type);
				}
				this.$c.bind(type, data, fn);
				return this;
			},

			// (chainable)
			add_handlers: function(handlers, data, replace) {
				var i;
				for (i in handlers) {
					this.bind(i, data, handlers[i], replace);
				}
				return this;
			},

			// (chainable)
			set_enabled: function(enabled) {
				return this;
			},

			destroy: function() {
				this.$c.remove();
			}
		}
	});

//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

	NI.field = field;
	
}(this, this.jQuery));