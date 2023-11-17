async function getToken() {
	const myHeaders = new Headers();
	myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

	const urlencoded = new URLSearchParams();
	urlencoded.append("grant_type", "client_credentials");
	urlencoded.append("client_id", "RSUH4FxzGlYKzbH3TgPginILlrc6e9yl");
	urlencoded.append("client_secret", "l8ykdC6gjoG9jKGl");

	const requestOptions = {
		method: "POST",
		headers: myHeaders,
		body: urlencoded,
		redirect: "follow",
	};

	const request = await fetch(
		"https://test.api.amadeus.com/v1/security/oauth2/token",
		requestOptions
	);
	const data = await request.json();
	return data.access_token;
}

function mapLocationToAirport(location) {
	const locationAirportMap = {
		London: "LON",
		Belfast: "BFS",
		Paris: "PAR",
	};
	return locationAirportMap[location];
}

async function getFlightOffers(
	token,
	origin = "LHR",
	destination = "JFK",
	departure_date = "2023-12-01"
) {
	const mappedOrigin = mapLocationToAirport(origin);
	const mappedDestination = mapLocationToAirport(destination);

	const myHeaders = new Headers();
	myHeaders.append("Content-Type", "application/vnd.amadeus+json");
	myHeaders.append("Authorization", `Bearer ${token}`);

	const raw = JSON.stringify({
		currencyCode: "USD",
		originDestinations: [
			{
				id: "1",
				originLocationCode: mappedOrigin,
				destinationLocationCode: mappedDestination,
				departureDateTimeRange: {
					date: departure_date,
					time: "10:00:00",
				},
			},
		],
		travelers: [
			{
				id: "1",
				travelerType: "ADULT",
			},
		],
		sources: ["GDS"],
		searchCriteria: {
			maxFlightOffers: 2,
			flightFilters: {
				cabinRestrictions: [
					{
						cabin: "BUSINESS",
						coverage: "MOST_SEGMENTS",
						originDestinationIds: ["1"],
					},
				],
			},
		},
	});

	const requestOptions = {
		method: "POST",
		headers: myHeaders,
		body: raw,
		redirect: "follow",
	};

	const response = await fetch(
		"https://test.api.amadeus.com/v2/shopping/flight-offers",
		requestOptions
	);
	const data = await response.json();
	return data;
}

async function bookFlights(token, data) {
	const myHeaders = new Headers();
	myHeaders.append("Content-Type", "application/vnd.amadeus+json");
	myHeaders.append("Authorization", `Bearer ${token}`);

	const raw = JSON.stringify({
		data: {
			type: "flight-order",
			flightOffers: [data],
			travelers: [
				{
					id: "1",
					dateOfBirth: "1970-01-01",
					name: {
						firstName: "TEST",
						lastName: "USER",
					},
					gender: "MALE",
					contact: {
						emailAddress: "test@user.com",
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
			remarks: {
				general: [
					{
						subType: "GENERAL_MISCELLANEOUS",
						text: "ONLINE BOOKING FROM TEST USER",
					},
				],
			},
			ticketingAgreement: {
				option: "DELAY_TO_CANCEL",
				delay: "6D",
			},
			contacts: [
				{
					addresseeName: {
						firstName: "TEST",
						lastName: "USER",
					},
					companyName: "TEST COMPANY",
					purpose: "STANDARD",
					phones: [
						{
							deviceType: "LANDLINE",
							countryCallingCode: "34",
							number: "480080071",
						},
						{
							deviceType: "MOBILE",
							countryCallingCode: "33",
							number: "480080072",
						},
					],
					emailAddress: "support@testcompany.es",
					address: {
						lines: ["Calle Prado, 16"],
						postalCode: "28014",
						cityName: "Madrid",
						countryCode: "ES",
					},
				},
			],
		},
	});

	const requestOptions = {
		method: "POST",
		headers: myHeaders,
		body: raw,
		redirect: "follow",
	};

	const response = await fetch(
		"https://test.api.amadeus.com/v1/booking/flight-orders",
		requestOptions
	);
	const responseData = await response.json();
	return responseData;
}

module.exports = {
	getToken,
	getFlightOffers,
	bookFlights,
};
