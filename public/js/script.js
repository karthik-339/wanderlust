(() => {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })
})()

document.addEventListener('DOMContentLoaded', () => {
  const mapEl = document.getElementById('map')
  if (!mapEl || typeof L === 'undefined') return

  const lat = parseFloat(mapEl.dataset.lat || '51.505')
  const lng = parseFloat(mapEl.dataset.lng || '-0.09')
  const safeLat = Number.isFinite(lat) ? lat : 51.505
  const safeLng = Number.isFinite(lng) ? lng : -0.09
  const popupText = mapEl.dataset.popup || 'A pretty CSS popup.<br> Easily customizable.'

  mapEl.innerHTML = ''
  const map = L.map('map').setView([safeLat, safeLng], 13)

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map)

  L.marker([safeLat, safeLng]).addTo(map)
    .bindPopup(popupText)
    .openPopup()
})