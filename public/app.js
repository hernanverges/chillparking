// Inicializar el mapa sin centrarlo en una ubicación fija
var map = L.map('map').setView([0, 0], 16); // Se actualizará cuando obtenga la ubicación

// Cargar la capa de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Función para obtener la ubicación del usuario
function onLocationFound(e) {
  const lat = e.latlng.lat;
  const lon = e.latlng.lng;

  // Centrar el mapa en la ubicación del usuario con más zoom
  map.setView([lat, lon], 16); // 🔥 Aumenté el zoom a 18

  // Si ya hay un marcador, eliminarlo antes de crear uno nuevo
  if (userMarker) {
    userMarker.remove();
  }

  // Crear un icono HTML personalizado para el usuario
  var userIcon = L.divIcon({
    className: 'user-location' // Clase CSS para el estilo personalizado
  });

  // Agregar marcador de la ubicación del usuario
  userMarker = L.marker([lat, lon], { icon: userIcon }).addTo(map);

  
}



// Configurar el mapa para obtener la ubicación del usuario y centrarlo automáticamente
map.on('locationfound', onLocationFound);

// Pedir al navegador que obtenga la ubicación con alta precisión y mucho zoom
map.locate({ setView: true, maxZoom: 18, enableHighAccuracy: true });


// Función cuando el usuario hace clic en "Dejar lugar"
document.getElementById('dejarLugar').addEventListener('click', function() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      // Obtener la última ubicación guardada y su timestamp
      const ultimaUbicacion = JSON.parse(localStorage.getItem('ultimaUbicacion'));

      if (ultimaUbicacion) {
        const distancia = distanciaEntrePuntos(ultimaUbicacion.lat, ultimaUbicacion.lon, lat, lon);
        const tiempoPasado = tiempoTranscurrido(ultimaUbicacion.timestamp);

        if (distancia < DISTANCIA_MINIMA && tiempoPasado < 5) {
          mostrarCartelErrorDistancia(); // Mostrar el cartel si la distancia es menor y no han pasado 15 minutos
          return;
        }
      }

      // Guardar nueva ubicación con timestamp en localStorage
      localStorage.setItem('ultimaUbicacion', JSON.stringify({ lat, lon, timestamp: Date.now() }));

      // Enviar los datos al servidor
      fetch('http://localhost:3001/api/parkings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ latitude: lat, longitude: lon })
      })
      .then(response => response.json())
      .then(data => console.log('Lugar guardado correctamente:', data))
      .catch(error => console.error('Error al guardar el lugar:', error));

      // Crear un ícono verde para el lugar de estacionamiento disponible
      var availableParkingIcon = L.icon({
        iconUrl: 'assets/location_on.png',
        iconSize: [30, 30],
        iconAnchor: [20, 20],
        popupAnchor: [0, -12]
      });

      // Crear un marcador en la ubicación del usuario
      var marker = L.marker([lat, lon], {icon: availableParkingIcon}).addTo(map)
        .bindPopup("Lugar disponible para estacionar");

      markers.push(marker); // Guardar el marcador en el array de marcadores

    }, function(error) {
      alert("No se pudo obtener la ubicación.");
    });
  } else {
    alert("Tu navegador no soporta geolocalización.");
  }
});

// Función para cargar los lugares de estacionamiento disponibles desde el servidor
function cargarParkingsDisponibles() {
  actualizarUbicacionUsuario();
  fetch('http://localhost:3001/api/parkings')
    .then(response => response.json())
    .then(parkings => {
      clearMarkers(); // Eliminar los marcadores antiguos

      parkings.forEach(parking => {
        const lat = parking.latitude;
        const lon = parking.longitude;

        var availableParkingIcon = L.icon({
          iconUrl: 'assets/location_on.png',
          iconSize: [30, 30],
          iconAnchor: [20, 20],
          popupAnchor: [0, -12]
        });

        const marker = L.marker([lat, lon], {icon: availableParkingIcon}).addTo(map)
          .bindPopup("Lugar disponible para estacionar");

        markers.push(marker); // Guardar el marcador en el array
      });
    })
    .catch(error => console.error('Error al cargar los lugares:', error));
}


// Cargar los lugares de estacionamiento cuando se carga la página
cargarParkingsDisponibles();

// Función cuando el usuario hace clic en "Buscar lugar"
document.getElementById('buscarLugar').addEventListener('click', function() {
  clearMarkers(); // Eliminar los marcadores antiguos
  actualizarUbicacionUsuario();
  cargarParkingsDisponibles(); // Actualizar los marcadores manualmente
  
  
  // Verificar si hay lugares disponibles en el servidor
  fetch('http://localhost:3001/api/parkings')
    .then(response => response.json())
    .then(parkings => {
      if (parkings.length === 0) {
        // Si no hay lugares, mostrar el cartel por 2 segundos
        mostrarCartelSinLugares();
      } else {
        // Si hay lugares, ocultar el cartel
        ocultarCartelSinLugares();
      }
    })
    .catch(error => console.error('Error al cargar los lugares:', error));
});

// Función para mostrar el cartel "sin lugares"
function mostrarCartelSinLugares() {
  const cartel = document.getElementById('sinLugares');
  cartel.style.display = 'block'; // Mostrar el cartel
  setTimeout(() => {
    cartel.style.display = 'none'; // Ocultar el cartel después de 2 segundos
  }, 2000);
}

// Función para ocultar el cartel "sin lugares"
function ocultarCartelSinLugares() {
  const cartel = document.getElementById('sinLugares');
  cartel.style.display = 'none'; // Asegurarse de que el cartel esté oculto
}


// Guardar los marcadores actuales en un array para poder eliminarlos cuando sea necesario
let markers = [];

// Función para borrar todos los marcadores del mapa
function clearMarkers() {
  markers.forEach(marker => {
    marker.remove(); // Eliminar el marcador del mapa
  });
  markers = [];  // Vaciar el array de marcadores
}

// Guardar referencia al marcador del usuario
let userMarker = null;
let userCircle = null;

// Función para actualizar la ubicación del usuario
function actualizarUbicacionUsuario() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      // Eliminar marcador y círculo anteriores si existen
      if (userMarker) {
        userMarker.remove();
      }
      if (userCircle) {
        userCircle.remove();
      }

      // Crear un icono HTML personalizado para el usuario
      var userIcon = L.divIcon({
        className: 'user-location' // Clase CSS para el estilo personalizado
      });

      // Agregar nuevo marcador de la ubicación del usuario
      userMarker = L.marker([lat, lon], { icon: userIcon }).addTo(map)
        .openPopup();

    }, function(error) {
      alert("No se pudo obtener la ubicación.");
    }, { enableHighAccuracy: true });
  } else {
    alert("Tu navegador no soporta geolocalización.");
  }
}


// Actualizar los marcadores cada 30 segundos
setInterval(cargarParkingsDisponibles, 30000); // 30000 ms = 30 segundos

const DISTANCIA_MINIMA = 50; // Distancia mínima en metros

function distanciaEntrePuntos(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distancia en metros
}

// Función para mostrar el cartel de error por distancia
function mostrarCartelErrorDistancia() {
  const cartel = document.getElementById('errorDistancia');
  cartel.style.display = 'block';

  setTimeout(() => {
    cartel.style.display = 'none';
  }, 2000); // Ocultar después de 2 segundos
}

// Función para calcular el tiempo transcurrido en minutos
function tiempoTranscurrido(timestamp) {
  return (Date.now() - timestamp) / (10000 * 60); // Convierte milisegundos a minutos
}

document.addEventListener("DOMContentLoaded", () => {
  const toggleSwitch = document.getElementById("switchImg");
  const placesImage = document.getElementById("placesImage");
  let userLocation = null;
  let intervalo = null;
  let isSwitchOn = false; // Variable para almacenar el estado del switch

  // Obtener la ubicación del usuario
  if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (position) => {
              userLocation = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
              };
              console.log("Ubicación del usuario: ", userLocation);
          },
          (error) => console.log("Error obteniendo ubicación", error),
          { enableHighAccuracy: true }
      );
  } else {
      alert("Geolocalización no soportada por tu navegador");
  }

  // Manejador de evento para el switch (imagen)
  toggleSwitch.addEventListener("click", function () {
      isSwitchOn = !isSwitchOn; // Alternar el estado del switch

      // Cambiar la imagen
      toggleSwitch.src = isSwitchOn ? 'assets/switchon.png' : 'assets/switchoff.png';

      if (isSwitchOn) {
          // Si el interruptor está activado, comienza la búsqueda automática
          intervalo = setInterval(buscarLugarCercano, 1000);
      } else {
          // Si el interruptor está desactivado, para la búsqueda
          clearInterval(intervalo);
          placesImage.style.display = "none"; // Oculta la imagen
      }
  });

  // Función para calcular la distancia entre dos coordenadas (Haversine)
  function calcularDistancia(lat1, lng1, lat2, lng2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLng = (lng2 - lng1) * (Math.PI / 180);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
  }

  // Función para buscar lugares cercanos
  function buscarLugarCercano() {
      if (!userLocation) {
          console.log("Esperando la ubicación del usuario...");
          return;
      }

      const radioMaximo = 1;
      let hayMarcadoresCerca = markers.some(marker => {
        const { lat, lng } = marker.getLatLng();
        const distancia = calcularDistancia(userLocation.lat, userLocation.lng, lat, lng);
        return distancia <= radioMaximo;
    });

      if (hayMarcadoresCerca) {
          mostrarImagen(placesImage);
      } else {
          placesImage.style.display = "none";
      }
  }

  // Función para mostrar la imagen de lugares encontrados por 3 segundos
  function mostrarImagen(imagenMostrar) {
      imagenMostrar.style.display = "block";
      setTimeout(() => {
          imagenMostrar.style.display = "none";
      }, 3000);
  }

  // Inicializa la imagen en "none"
  placesImage.style.display = "none";
});
