import { useState, useEffect } from 'react';
import { Cloud, CloudRain, CloudSnow, Sun, CloudDrizzle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface WeatherData {
  temperature: number;
  temperatureMax: number;
  temperatureMin: number;
  precipitation: number;
  weatherCode: number;
  summary: string;
}

function getWeatherIcon(code: number, size: string = "w-6 h-6") {
  if (code === 0) return <Sun className={`${size} text-yellow-500`} />;
  if (code <= 3) return <Cloud className={`${size} text-gray-400`} />;
  if (code <= 67 || code === 80 || code === 81) return <CloudRain className={`${size} text-blue-500`} />;
  if (code <= 77 || code === 85 || code === 86) return <CloudSnow className={`${size} text-blue-300`} />;
  return <CloudDrizzle className={`${size} text-gray-500`} />;
}

function getWeatherSummary(code: number, temp: number, precipitation: number): string {
  const tempDesc = temp > 70 ? "warm" : temp > 50 ? "mild" : temp > 32 ? "cool" : "cold";
  
  if (code === 0) return `Clear and ${tempDesc} today`;
  if (code <= 3) return `Partly cloudy and ${tempDesc}`;
  if (precipitation > 0.5) return `Rainy and ${tempDesc} - pack rain gear`;
  if (code <= 67) return `Light rain expected, ${tempDesc}`;
  if (code >= 71 && code <= 77) return `Snow possible, ${tempDesc}`;
  return `Cloudy and ${tempDesc}`;
}

export function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const latitude = 42.4859;
        const longitude = -83.1052;
        
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America%2FNew_York&forecast_days=1`
        );
        
        if (!response.ok) throw new Error('Weather fetch failed');
        
        const data = await response.json();
        
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          temperatureMax: Math.round(data.daily.temperature_2m_max[0]),
          temperatureMin: Math.round(data.daily.temperature_2m_min[0]),
          precipitation: data.current.precipitation || 0,
          weatherCode: data.current.weather_code,
          summary: getWeatherSummary(
            data.current.weather_code,
            data.current.temperature_2m,
            data.current.precipitation || 0
          ),
        });
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch weather:', err);
        setError(true);
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="border-border/50" data-testid="card-weather">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="border-border/50" data-testid="card-weather">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-muted/10 rounded-lg shrink-0">
              <Cloud className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground mb-1">Today's Weather</p>
              <p className="text-sm text-muted-foreground">Unable to load weather</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 hover-elevate transition-all" data-testid="card-weather">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg shrink-0" aria-hidden="true">
            {getWeatherIcon(weather.weatherCode)}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Today's Weather
            </p>
            
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {weather.temperature}°F
            </p>
            
            <p className="text-sm text-muted-foreground mt-1">
              H: {weather.temperatureMax}° L: {weather.temperatureMin}°
            </p>
            
            {weather.precipitation > 0 && (
              <p className="text-xs text-blue-500 mt-1">
                Precipitation: {weather.precipitation.toFixed(2)}"
              </p>
            )}
            
            <p className="text-xs text-muted-foreground mt-2 italic">
              {weather.summary}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
