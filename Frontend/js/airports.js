/* ============================================================
   INTERNATIONAL HANDOFFS HAPPEN AT AIRPORTS

   Any place outside the US, and both ends of a trip between two
   countries, must be an airport. When someone picks a city or an
   address there, we offer the closest airports to choose from.
   Used by the sender and traveler screens.
============================================================ */
(function () {
  const HOME_COUNTRY = "US";
  const SEARCH_RADIUS_METERS = 200000;
  const MAX_CHOICES = 3;

  // Google also returns terminals, lounges and airstrips under "airport".
  // Treat anything this close to a busier result as the same airport.
  const SAME_AIRPORT_MILES = 4;
  const MIN_REVIEWS_INTERNATIONAL = 40;
  const MIN_REVIEWS_OTHER = 100;

  // Keeps small and military fields out when a much busier airport is near.
  const MIN_SHARE_OF_BUSIEST = 0.05;

  const AIRPORT_NAME = /airport|a[ée]roport|aeropuerto|aeroporto|flughafen|机场|機場|空港|مطار/i;
  const INTERNATIONAL_NAME = /international|intl|internacional|国际|國際/i;
  const PLUS_CODE = /^[A-Z0-9]{2,8}\+[A-Z0-9]{2,3},?\s*/;

  const TEXT = {
    choose: "International handoffs happen at an airport. Choose the closest one.",
    searching: "Finding nearby airports...",
    none: "We couldn't find an airport near here. Type the airport name in this box."
  };

  function straightMiles(from, to) {
    const radians = (degrees) => degrees * Math.PI / 180;
    const latChange = radians(to.lat - from.lat);
    const lngChange = radians(to.lng - from.lng);
    const a =
      Math.sin(latChange / 2) ** 2 +
      Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) *
      Math.sin(lngChange / 2) ** 2;

    return 3958.8 * 2 * Math.asin(Math.sqrt(a));
  }

  function countryOf(addressComponents) {
    const country = (addressComponents || []).find((part) =>
      part.types.includes("country")
    );

    const state = (addressComponents || []).find((part) =>
      part.types.includes("administrative_area_level_1")
    );

    return {
      country: country?.short_name || "",
      countryName: country?.long_name || "",
      state: state?.short_name || ""
    };
  }

  function isInternational(first, second) {
    const countries = [first?.country, second?.country].filter(Boolean);

    return countries.some((country) => country !== HOME_COUNTRY) ||
      (countries.length === 2 && countries[0] !== countries[1]);
  }

  function needsAirport(place, otherPlace) {
    return Boolean(place?.country) &&
      !place.isAirport &&
      isInternational(place, otherPlace);
  }

  function looksLikeAirport(result) {
    const reviews = result.user_ratings_total || 0;
    const minimum = INTERNATIONAL_NAME.test(result.name)
      ? MIN_REVIEWS_INTERNATIONAL
      : MIN_REVIEWS_OTHER;

    return (result.types || []).includes("airport") &&
      AIRPORT_NAME.test(result.name) &&
      reviews >= minimum;
  }

  function inCountry(airport, place) {
    if (place.country === HOME_COUNTRY) return /(USA|United States)$/.test(airport.city);
    return airport.city.includes(place.countryName);
  }

  function toAirport(result, place) {
    const position = {
      lat: result.geometry.location.lat(),
      lng: result.geometry.location.lng()
    };

    return {
      ...position,
      name: result.name,
      city: (result.formatted_address || "").replace(PLUS_CODE, ""),
      reviews: result.user_ratings_total || 0,
      miles: straightMiles(place, position)
    };
  }

  function closestAirports(results, place) {
    const distinct = [];
    const airports = results
      .filter(looksLikeAirport)
      .map((result) => toAirport(result, place))
      .sort((a, b) => b.reviews - a.reviews);
    const busiest = airports[0]?.reviews || 0;

    airports
      .filter((airport) =>
        INTERNATIONAL_NAME.test(airport.name) ||
        airport.reviews >= busiest * MIN_SHARE_OF_BUSIEST
      )
      .forEach((airport) => {
        const repeat = distinct.some((kept) =>
          straightMiles(kept, airport) < SAME_AIRPORT_MILES
        );

        if (!repeat) distinct.push(airport);
      });

    // Google writes some countries differently in addresses (UK, for one),
    // so a country with no match still gets its nearest airports.
    const local = distinct.filter((airport) => inCountry(airport, place));

    return (local.length ? local : distinct)
      .sort((a, b) => a.miles - b.miles)
      .slice(0, MAX_CHOICES);
  }

  function findAirports(place) {
    const service = new google.maps.places.PlacesService(
      document.createElement("div")
    );

    return new Promise((resolve) => {
      service.textSearch(
        {
          query: "international airport",
          location: { lat: place.lat, lng: place.lng },
          radius: SEARCH_RADIUS_METERS
        },
        (results, status) => {
          const found = status === google.maps.places.PlacesServiceStatus.OK;
          resolve(found ? closestAirports(results, place) : []);
        }
      );
    });
  }

  function addressOf(airport) {
    return airport.city.includes(airport.name)
      ? airport.city
      : `${airport.name}, ${airport.city}`;
  }

  function chooserFor(input) {
    const shell = input.closest(".input-shell") || input;
    let chooser = shell.parentElement.querySelector(".airport-choices");

    if (!chooser) {
      chooser = document.createElement("div");
      chooser.className = "airport-choices";
      shell.insertAdjacentElement("afterend", chooser);
    }

    return chooser;
  }

  function showMessage(chooser, text) {
    const message = document.createElement("p");
    message.className = "airport-note";
    message.setAttribute("role", "status");
    message.textContent = text;
    chooser.replaceChildren(message);
  }

  function airportButton(airport, onPick) {
    const button = document.createElement("button");
    const name = document.createElement("strong");
    const detail = document.createElement("span");

    button.type = "button";
    button.className = "airport-choice";
    name.textContent = airport.name;
    detail.textContent = `${airport.city} · ${Math.round(airport.miles)} mi`;
    button.append(name, detail);
    button.addEventListener("click", () => onPick(airport));

    return button;
  }

  // A trip with a foreign end is international, whatever was selected before.
  function lockDeliveryType(select, international) {
    if (international && !select.disabled) {
      select.dataset.chosenType = select.value;
      select.value = "international";
      select.disabled = true;
    } else if (!international && select.disabled) {
      select.value = select.dataset.chosenType;
      select.disabled = false;
    }
  }

  /*
     Keeps the two ends of a trip following the airport rule.

     inputs   { first: element, second: element }
     apply    (end, place) a place is settled: save it and show it
     clear    (end) this end is waiting for an airport: forget its coordinates
     changed  (international) the rule has been applied to both ends
  */
  function createController({ inputs, apply, clear, changed }) {
    const ends = {};

    Object.keys(inputs).forEach((end) => {
      ends[end] = { input: inputs[end], place: null, waiting: null };
    });

    const otherEnd = (end) => Object.keys(ends).find((name) => name !== end);

    function stopWaiting(end) {
      ends[end].waiting = null;
      chooserFor(ends[end].input).replaceChildren();
    }

    function pickAirport(end, airport) {
      const place = {
        address: addressOf(airport),
        lat: airport.lat,
        lng: airport.lng,
        country: ends[end].place.country,
        countryName: ends[end].place.countryName,
        isAirport: true
      };

      ends[end].input.value = place.address;
      set(end, place);
    }

    async function askForAirport(end) {
      const state = ends[end];
      const place = state.place;
      const chooser = chooserFor(state.input);

      state.waiting = place;
      clear(end);
      showMessage(chooser, TEXT.searching);

      const airports = await findAirports(place);

      // They may have changed this address while we were searching.
      if (state.waiting !== place) return;

      if (!airports.length) {
        showMessage(chooser, TEXT.none);
        return;
      }

      showMessage(chooser, TEXT.choose);
      chooser.append(
        ...airports.map((airport) =>
          airportButton(airport, (picked) => pickAirport(end, picked))
        )
      );
    }

    function review() {
      Object.keys(ends).forEach((end) => {
        const state = ends[end];
        const required = needsAirport(state.place, ends[otherEnd(end)].place);

        if (required && state.waiting !== state.place) {
          askForAirport(end);
        } else if (!required && state.waiting) {
          stopWaiting(end);
          apply(end, state.place);
        }
      });

      const [first, second] = Object.values(ends).map((state) => state.place);
      changed(isInternational(first, second));
    }

    function set(end, place) {
      stopWaiting(end);
      ends[end].place = place;
      apply(end, place);
      review();
    }

    return {
      set,
      isWaiting: () => Object.values(ends).some((state) => state.waiting)
    };
  }

  window.FlexagoAirports = {
    countryOf,
    createController,
    lockDeliveryType,
    straightMiles
  };
})();
