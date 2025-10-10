const pltfrm = app.get('Pltfrm')
const medPltfrm = app.get('MedPltfrm')
const lrgPltfrm = app.get('LrgPltfrm')
const xlrgPltfrm = app.get('XlrgPltfrm')
const fallnPltfrm = app.get('FllnPltfrm')

medPltfrm.visible = false
lrgPltfrm.visible = false
xlrgPltfrm.visible = false
fallnPltfrm.visible = false

app.configure([
  {
    type: 'switch',
    key: 'platformType',
    label: 'Platform Type',
    options: [
      { label: 'Small', value: 'small' },
      { label: 'Medium', value: 'medium' },
      { label: 'Large', value: 'large' },
      { label: 'X-Large', value: 'x-large' },
      { label: 'Falling', value: 'falling' },
    ],
  },
])
