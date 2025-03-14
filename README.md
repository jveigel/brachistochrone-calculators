# Brachistochrone Interstellar and Solar System Calculators

Currenlty the jsx files are designed to run on an Astro site with tailwind. But I am migrating to next.js tsx files soon. 

## Scripts
`InterstellarDeltaVCalculator.jsx` - A simple estimate of travel times based on arbitrary Delta-v ammounts. Simple relativistic hacks in the math to get reasonable estimates. 


`CalcInterstellarRelativisticRocket` - Interstellar Relativistic Rocket Calculator derived from https://github.com/nathangeffen/space-travel

***

`BrachistochroneCalculator.py`
`BrachistochroneCalculator.jsx`

Python version saves a csv and markdown file with the results of the brachistochrone trajectories at 1/3g (example below.) The .jsx is a React component version. Hosted on https://overvieweffekt.com/.

***

`EpsteinDriveCalculator.py`

Is a script that attempt to estimate the interstellar travel times using a relativistic brachistochrone equation for the Nauvoo from the Expanse. It is completly broken.



### Tailwind CSS Integration

These components uses Tailwind CSS classes. Make sure you have Tailwind CSS configured in your project. 

```bash
npx astro add tailwind
```
