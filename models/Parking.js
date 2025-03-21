const mongoose = require('mongoose');

const parkingSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: [true, 'La latitud es requerida']
  },
  longitude: {
    type: Number,
    required: [true, 'La longitud es requerida']
  },
  fecha: {
    type: Date,
    default: Date.now
  }
});

const Parking = mongoose.model('Parking', parkingSchema);

module.exports = Parking;
