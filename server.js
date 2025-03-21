const express = require('express');
const mongoose = require('mongoose');
const Parking = require('./models/Parking'); // Cambio Lugar por Parking

const app = express();
const port = 3001;

// Middleware
const cors = require('cors'); // Importar CORS
app.use(cors()); // Habilitar CORS para todas las solicitudes

app.use(express.json());
app.use(express.static('public'));

// Conectar a la base de datos MongoDB
mongoose.connect('mongodb+srv://hernansyc:123Tense12@cluster0.lm9a6.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Conectado a MongoDB');
}).catch((err) => {
  console.log('Error al conectar a MongoDB: ', err);
});

// Ruta POST para guardar un lugar de estacionamiento
app.post('/api/parkings', async (req, res) => {
  try {
    console.log('Datos recibidos:', req.body);

    const parking = new Parking({
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      fecha: new Date()
    });

    await parking.save();
    res.status(201).json({ message: 'Lugar guardado con éxito' }); // Respuesta en formato JSON
  } catch (error) {
    console.error('Error al guardar lugar:', error);
    res.status(500).json({ error: 'Error al guardar lugar' }); // También devuelve JSON en caso de error
  }
});

// Ruta GET para obtener todos los lugares de estacionamiento
app.get('/api/parkings', async (req, res) => {
  try {
    const parkings = await Parking.find();
    res.json(parkings);
  } catch (error) {
    console.error('Error al obtener los lugares:', error);
    res.status(500).send('Error al obtener los lugares');
  }
});


// Ruta DELETE para eliminar un lugar después de 5 minutos
app.delete('/api/parkings/:id', async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.id);
    if (!parking) {
      return res.status(404).send('Lugar no encontrado');
    }

    await parking.deleteOne();  // Elimina el documento de la base de datos
    res.send('Lugar eliminado correctamente');
  } catch (error) {
    console.error('Error al eliminar lugar:', error);
    res.status(500).send('Error al eliminar lugar');
  }
});

setInterval(async () => {
  try {
    const parkings = await Parking.find();
    const now = new Date();
    
    parkings.forEach(async (parking) => {
      const tiempoPasado = now - new Date(parking.fecha); // Diferencia entre el momento actual y la fecha del parking
      if (tiempoPasado > 5 * 60 * 1000) { // 5 minutos en milisegundos
        await Parking.findByIdAndDelete(parking._id); // Eliminar el parking
        console.log(`Lugar de estacionamiento con ID ${parking._id} eliminado automáticamente`);
      }
    });
  } catch (error) {
    console.error('Error al eliminar lugares automáticamente:', error);
  }
}, 30 * 1000); // Revisa cada 30 segundos


// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
