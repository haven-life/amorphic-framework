# SuperType
## Description

SuperType is a type system for JavaScript that supports:

- Classical inheritence

- Mixins

- Composition including collections

## Installation
Include `lib/index.js` for use in the browser.  Install on node via npm:

    npm install supertype

It is automatically installed as a dependency for [Amorphic](https://github.com/haven-life/amorphic)

## Example
Classes are defined as "templates".

    ObjectTemplate = require('supertype');

    Animal = ObjectTemplate.create("Animal",
    {
        name: {type: String},
        isMammal: {type: Boolean, value: true},
        legs: {type: Number, value: 2}
    });

    Lion = Animal.extend("Lion",
    {
        init: function () {
            Animal.call(this);
            this.name = "Lion";
            this.legs = 4;
        },
        canRoar: function () {return true}
    });

    Bear = Animal.extend("Bear",
    {
        init: function () {
            Animal.call(this);
            this.name = "Bear";
        },
        canHug: function () {return true}
    });

    Ark = ObjectTemplate.create("Ark",
    {
        animals: {type: Array, of: Animal, value: []},
        board: function (animal) {
            animal.ark = this;
            this.animals.push(animal)
        }
    });
    Animal.mixin(
    {
        ark:    {type: Ark}
    });

You create objects using `new`:

    var ark1 = new Ark();
    ark1.board(new Lion());
    ark1.board(new Bear());

    var ark2 = new Ark();
    ark2.board(new Lion());
    ark2.board(new Bear());


Because SuperType knows about the interrelationships between your objects you can serialize and de-serialize even though you have circular references:

    var serialArk1 = ark1.toJSONString();
    var serialArk2 = ark2.toJSONString();
    ark1 = Ark.fromJSON(serialArk1);
    ark2 = Ark.fromJSON(serialArk2);

## License

SuperType is licensed under the MIT license
