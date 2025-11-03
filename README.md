# ar-rainradar
Ziel : AR Rain Radar soll Regenradardaten in Augmented Reality anzeigen. Basierend auf dem aktuellen Standort wird die Regen- und Wolkenvorhersage direkt in den Himmel über dem Nutzer projiziert. Durch Farbcodes wird die Niederschlagsintensität veranschaulicht und mehrere Zeitschritte sollen das Verfolgen der Wetterentwicklung ermöglichen.

Für Demonstrationszwecke ist ein zusätzliches Ziel einen Modus für einen besonders regenreichen Ort zuintegriert, falls es vor Ort gerade sonnig ist.

Funktionen:
- Anzeige von Regen- und Wolkenvorhersagen in AR
- Farbcodierte Niederschlagsintensität
- Zeitliche Vorhersage-Animation
- Umschaltbarer Standort (lokal / regenreicher Ort)

Voraussetzungen:
Smartphone bzw. Tablet mit AR-Unterstützung.


Link: https://lenabr-ar.github.io/ar-rainradar/


Schnittstelle Wetterdaten - Bright Sky API:
Die Bright Sky API ist eine kostenlose Schnittstelle, über die aktuelle Wetterdaten und Wettervorhersagen abgerufen werden können. Sie nutzt Daten des Deutschen Wetterdienstes (DWD) und bietet unter anderem Niederschlagsradar, Temperatur, Wind, Bewölkung und Prognosen. Die API liefert die Daten in einem leicht nutzbaren JSON-Format, wodurch sie sich gut für Anwendungen wie das AR Rain Radar eignet.
https://brightsky.dev/docs/#/operations/getCurrentWeather

