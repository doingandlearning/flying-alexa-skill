const Alexa = require("ask-sdk-core");
const AWS = require("aws-sdk");
const Amadeus = require("amadeus");
const ddbAdapter = require("ask-sdk-dynamodb-persistence-adapter");
const { formatDuration } = require("./utils");

const SKILL_NAME = "Fun Flight Booking Skill";

const amadeus = new Amadeus({
    clientId: "",
    clientSecret: "",
});

const airportCode = {
    London: "LON",
    Belfast: "BFS",
    Paris: "PAR",
    "New York": "NYC",
    Chicago: "ORD",
};

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
        );
    },
    handle(handlerInput) {
        const speechText = `Welcome to ${SKILL_NAME}. Where are you travelling from and to and when do you want to go?`;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard(
                `Welcome to ${SKILL_NAME}. Ask me the weather!`,
                speechText
            )
            .getResponse();
    },
};

const TravelIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === "TravelIntent"
        );
    },
    async handle(handlerInput) {
        const fromCity = Alexa.getSlotValue(
            handlerInput.requestEnvelope,
            "fromCity"
        );
        let slotToCity = Alexa.getSlotValue(handlerInput.requestEnvelope, "toCity");
        let dateOfDeparture = Alexa.getSlotValue(
            handlerInput.requestEnvelope,
            "dateOfDeparture"
        );
        const attributesManager = handlerInput.attributesManager;

        let toCity;
        let speechText;
        let attributes;

        if (!slotToCity) {
            attributes = (await attributesManager.getPersistentAttributes()) || {};
            toCity = attributes.hasOwnProperty("toCity") ? attributes.toCity : "";
        } else {
            attributes = { toCity: slotToCity };
            attributesManager.setPersistentAttributes(attributes);
            await attributesManager.savePersistentAttributes();
            toCity = slotToCity;
        }

        if (!toCity) {
            speechText = "I'm sorry, we need a destination to find you some flights.";
            return handlerInput.responseBuilder
                .speak(speechText)
                .withSimpleCard("Your travel info", speechText)
                .getResponse();
        }

        const flightOffers = await amadeus.shopping.flightOffersSearch.get({
            originLocationCode: airportCode[fromCity],
            destinationLocationCode: airportCode[toCity],
            departureDate: dateOfDeparture,
            adults: "1",
            max: "7",
        });

        console.log("from the api", flightOffers);

        console.log("result", flightOffers.result);
        // const { meta, data, ...rest } = await getFlightOffers(token, fromCity, toCity)
        // console.log("Logging the data:", meta, data, rest)
        const count = flightOffers.result?.meta?.count;
        console.log(count);
        if (!count || count === 0) {
            speechText = `I'm sorry, we can't find any flights at that time.`;
            return handlerInput.responseBuilder
                .speak(speechText)
                .withSimpleCard("Your travel info", speechText)
                .getResponse();
        }
        const offers = flightOffers.data
            .filter((_, idx) => idx < 2)
            .map((offer, idx) => {
                let output = `Option number ${idx + 1}`;
                offer.itineraries.forEach((itinerary) => {
                    itinerary.segments.forEach((segment, segmentIndex) => {
                        output += `Part ${segmentIndex + 1} takes off from ${segment.departure.iataCode
                            } and lands at ${segment.arrival.iataCode
                            }, flight time would be ${formatDuration(segment.duration)}. `;
                    });
                });
                return output;
            })
            .join("\n");

        speechText = `We've found ${count} flights. Here are two options. ${offers}`;

        attributes.data = flightOffers.data;
        attributesManager.setPersistentAttributes(attributes);
        await attributesManager.savePersistentAttributes();

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard("Your travel info", speechText)
            .getResponse();
    },
};

const BookingIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === "BookingIntent"
        );
    },
    async handle(handlerInput) {
        console.log("Booking Intent Handler")
        let selection = Alexa.getSlotValue(
            handlerInput.requestEnvelope,
            "selection"
        );
        if (!selection) {
            speechText = `Sorry. We need you to pick an option`;
            return handlerInput.responseBuilder
                .speak(speechText)
                .withSimpleCard("Sorry. Couldn't price.", speechText)
                .getResponse();
        }
        const attributesManager = handlerInput.attributesManager;
        const attributes =
            (await attributesManager.getPersistentAttributes()) || {};
        let data = attributes.hasOwnProperty("data") ? attributes.data : "";
        console.log(data, attributes)
        if (!data) {
            speechText = `I'm sorry, we don't have a flight ready to book for you.`;
            return handlerInput.responseBuilder
                .speak(speechText)
                .withSimpleCard("Sorry. Couldn't book.", speechText)
                .getResponse();
        }
        try {
            const flight = data[selection];
            console.log(flight)
            const booking = await amadeus.booking.flightOrders.post(
                JSON.stringify({
                    data: {
                        type: "flight-order",
                        flightOffers: [flight],
                        travelers: [
                            {
                                id: "1",
                                dateOfBirth: "1982-01-16",
                                name: {
                                    firstName: "Test",
                                    lastName: "user",
                                },
                                gender: "MALE",
                                contact: {
                                    emailAddress: "test.user@test.es",
                                    phones: [
                                        {
                                            deviceType: "MOBILE",
                                            countryCallingCode: "34",
                                            number: "480080076",
                                        },
                                    ],
                                },
                                documents: [
                                    {
                                        documentType: "PASSPORT",
                                        birthPlace: "Madrid",
                                        issuanceLocation: "Madrid",
                                        issuanceDate: "2015-04-14",
                                        number: "00000000",
                                        expiryDate: "2025-04-14",
                                        issuanceCountry: "ES",
                                        validityCountry: "ES",
                                        nationality: "ES",
                                        holder: true,
                                    },
                                ],
                            },
                        ],
                    },
                })
            );
            console.log(booking)
            if (booking.data.id) {
                speechText = `All done! You're reference number is ${booking.data.id} have a good trip!`;
                return handlerInput.responseBuilder
                    .speak(speechText)
                    .withSimpleCard(`Booked. Ref: ${booking.data.id}`, speechText)
                    .getResponse();
            } else {
                speechText = `All done! You're reference number is ${booking.data.id} have a good trip!`;
                return handlerInput.responseBuilder
                    .speak(speechText)
                    .withSimpleCard(`Booked. Ref: ${booking.data.id}`, speechText)
                    .getResponse();
            }
        } catch (error) {
            console.log(error);
            speechText = `All done! You're reference number is ${booking.data.id} have a good trip!`;
            return handlerInput.responseBuilder
                .speak(speechText)
                .withSimpleCard(`Booked. Ref: ${booking.data.id}`, speechText)
                .getResponse();
        }
    },
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);

        return handlerInput.responseBuilder
            .speak("Sorry, I don't understand your command. Please say it again.")
            .reprompt("Sorry, I don't understand your command. Please say it again.")
            .getResponse();
    },
};

let skill;

exports.handler = async function (event, context) {
    console.log(`REQUEST++++${JSON.stringify(event)}`);
    if (!skill) {
        skill = Alexa.SkillBuilders.custom()
            .addRequestHandlers(
                LaunchRequestHandler,
                BookingIntentHandler,
                TravelIntentHandler
            )
            .addErrorHandlers(ErrorHandler)
            .withPersistenceAdapter(
                new ddbAdapter.DynamoDbPersistenceAdapter({
                    tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME,
                    createTable: true,
                    dynamoDBClient: new AWS.DynamoDB({
                        apiVersion: "latest",
                        region: process.env.DYNAMODB_PERSISTENCE_REGION,
                    }),
                })
            )
            .create();
    }

    const response = await skill.invoke(event, context);
    console.log(`RESPONSE++++${JSON.stringify(response)}`);

    return response;
};
