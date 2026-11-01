import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sun, 
  Cloud, 
  CloudSun, 
  CloudRain, 
  Wind, 
  Droplets, 
  Thermometer, 
  RefreshCw, 
  MapPin, 
  Activity, 
  BarChart3, 
  Zap, 
  Clock, 
  AlertCircle,
  Cpu,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GoogleWeatherWidget } from './GoogleWeatherWidget';

export interface WeatherData {
  state: string;
  district: string;
  area: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  cloudCover: number; // 0 - 100%
  uvIndex: number; // 0 - 12+
  uvIndexMax: number;
  directRadiation: number; // W/m2
  globalTiltedIrradiance: number; // W/m2
  windSpeed: number; // km/h
  precipitation: number; // mm
  weatherCode: number;
  sunrise: string;
  sunset: string;
  hourlyTimes: string[];
  hourlyUvIndex: number[];
  hourlyCloudCover: number[];
  hourlyDirectRadiation: number[];
  hourlyTemp: number[];
  lastUpdated: string;
}

export interface UserLocationAndEspProfile {
  state: string;
  district: string;
  area: string;
  latitude: number;
  longitude: number;
  espNodeId: string;
  espWifiSsid: string;
  espAuthToken: string;
  espStationName: string;
}

// All 28 Indian States (plus Delhi NCR & J&K) with their major solar & urban districts
const INDIAN_STATES_DATABASE: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 'Kakinada', 'Anantapur (Solar Park)', 'Kadapa', 'Rajahmundry'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro', 'Tezu', 'Bomdila'],
  'Assam': ['Guwahati / Kamrup', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif / Nalanda', 'Arrah', 'Begusarai', 'Katihar', 'Samastipur', 'Rohtas'],
  'Chhattisgarh': ['Raipur', 'Bhilai / Durg', 'Bilaspur', 'Korba', 'Rajnandgaon', 'Jagdalpur', 'Raigarh', 'Ambikapur'],
  'Goa': ['North Goa (Panaji)', 'South Goa (Margao)', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Kutch (Charanka Solar Park)', 'Junagadh', 'Anand', 'Bharuch', 'Navsari'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala / Kangra', 'Solan', 'Mandi', 'Kullu', 'Bilaspur', 'Hamirpur', 'Una', 'Chamba'],
  'Jharkhand': ['Ranchi', 'Jamshedpur / East Singhbhum', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh', 'Giridih', 'Ramgarh'],
  'Karnataka': ['Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru / Dakshina Kannada', 'Belagavi', 'Pavagada (Mega Solar Park)', 'Kalaburagi', 'Ballari', 'Tumakuru', 'Udupi', 'Shivamogga'],
  'Kerala': ['Thiruvananthapuram', 'Kochi / Ernakulam', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Alappuzha', 'Kannur', 'Kottayam', 'Malappuram', 'Wayanad'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Rewa (Ultra Mega Solar Plant)', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Singrauli'],
  'Maharashtra': ['Mumbai City', 'Mumbai Suburban', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Chhatrapati Sambhajinagar (Aurangabad)', 'Solapur', 'Kolhapur', 'Satara', 'Ahmednagar', 'Amravati', 'Nanded', 'Jalgaon'],
  'Manipur': ['Imphal East', 'Imphal West', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Ukhrul', 'Kakching'],
  'Meghalaya': ['Shillong / East Khasi Hills', 'Tura / West Garo Hills', 'Jowai / West Jaintia Hills', 'Nongpoh / Ri-Bhoi', 'Baghmara'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip', 'Kolasib', 'Lawngtlai'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Mon', 'Chumoukedima'],
  'Odisha': ['Bhubaneswar / Khordha', 'Cuttack', 'Rourkela / Sundargarh', 'Berhampur / Ganjam', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada / Mayurbhanj', 'Jharsuguda'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali / SAS Nagar', 'Hoshiarpur', 'Pathankot', 'Firozpur', 'Sangrur'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhadla (Mega Solar Park)', 'Jaisalmer', 'Bhilwara', 'Alwar', 'Sikar', 'Barmer', 'Sri Ganganagar', 'Pali', 'Chittorgarh'],
  'Sikkim': ['Gangtok / East Sikkim', 'Namchi / South Sikkim', 'Geyzing / West Sikkim', 'Mangan / North Sikkim', 'Pakyong', 'Soreng'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Erode', 'Kamuthi (Solar Plant)', 'Tirunelveli', 'Vellore', 'Thoothukudi', 'Dindigul', 'Thanjavur', 'Kanchipuram'],
  'Telangana': ['Hyderabad', 'Warangal / Hanamkonda', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam / Peddapalli', 'Mahbubnagar', 'Ranga Reddy', 'Medchal-Malkajgiri', 'Nalgonda', 'Siddipet'],
  'Tripura': ['Agartala / West Tripura', 'Dharmanagar / North Tripura', 'Udaipur / Gomati', 'Kailashahar / Unakoti', 'Belonia / South Tripura', 'Khowai'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur Nagar', 'Varanasi', 'Prayagraj', 'Noida / Gautam Buddha Nagar', 'Ghaziabad', 'Agra', 'Meerut', 'Bareilly', 'Aligarh', 'Moradabad', 'Gorakhpur', 'Jhansi', 'Ayodhya', 'Mathura', 'Saharanpur', 'Muzaffarnagar'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani / Nainital', 'Rudrapur / Udham Singh Nagar', 'Rishikesh', 'Almora', 'Pauri Garhwal', 'Tehri Garhwal', 'Pithoragarh'],
  'West Bengal': ['Kolkata', 'Howrah', 'North 24 Parganas', 'South 24 Parganas', 'Hooghly', 'Durgapur / Paschim Bardhaman', 'Asansol', 'Siliguri / Darjeeling', 'Purba Medinipur', 'Paschim Medinipur', 'Malda', 'Murshidabad', 'Nadia'],
  'Delhi NCR': ['New Delhi', 'South Delhi', 'North Delhi', 'East Delhi', 'West Delhi', 'Central Delhi', 'North East Delhi', 'South West Delhi'],
  'Jammu & Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Kathua', 'Udhampur', 'Samba', 'Pulwama', 'Kupwara']
};

const DEFAULT_PROFILE: UserLocationAndEspProfile = {
  state: 'Rajasthan',
  district: 'Jaipur',
  area: 'Mansarovar Solar Site',
  latitude: 26.9124,
  longitude: 75.7873,
  espNodeId: 'node_01',
  espWifiSsid: 'Farm_IOT_Station_2.4G',
  espAuthToken: 'ESP32_SECURE_AUTH_TOKEN_789',
  espStationName: 'Primary Rooftop Array'
};

interface SolarWeatherSectionProps {
  user?: any;
  onRequireSignIn?: () => void;
}

export const SolarWeatherSection: React.FC<SolarWeatherSectionProps> = ({
  user,
}) => {
  // Load saved profile
  const [profile, setProfile] = useState<UserLocationAndEspProfile>(() => {
    try {
      const saved = localStorage.getItem('solar_iot_user_profile_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PROFILE;
  });

  // State / District inputs
  const [selectedState, setSelectedState] = useState<string>(profile.state || 'Rajasthan');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(profile.district || 'Jaipur');
  const [selectedArea, setSelectedArea] = useState<string>(profile.area || 'Mansarovar Solar Site');

  // ESP32 Credentials
  const [showEspSettings, setShowEspSettings] = useState<boolean>(false);
  const [espNodeId, setEspNodeId] = useState<string>(profile.espNodeId || 'node_01');
  const [espWifiSsid, setEspWifiSsid] = useState<string>(profile.espWifiSsid || 'Farm_IOT_Station_2.4G');
  const [espAuthToken, setEspAuthToken] = useState<string>(profile.espAuthToken || 'ESP32_SECURE_AUTH_TOKEN_789');
  const [espStationName, setEspStationName] = useState<string>(profile.espStationName || 'Primary Rooftop Array');

  // Weather & status states
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Background auto-save to Firestore and localStorage
  const autoSaveProfile = useCallback(async (updated: UserLocationAndEspProfile) => {
    try {
      localStorage.setItem('solar_iot_user_profile_v2', JSON.stringify(updated));
      if (user && user.uid) {
        const userProfileRef = doc(db, 'user_profiles', user.uid);
        const userPresetsRef = doc(db, 'user_presets', user.uid);
        const data = {
          ...updated,
          userId: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          updatedAt: new Date().toISOString()
        };
        await Promise.allSettled([
          setDoc(userProfileRef, data, { merge: true }),
          setDoc(userPresetsRef, data, { merge: true })
        ]);
      }
    } catch (err) {
      console.warn('Auto-save sync note:', err);
    }
  }, [user]);

  // Load saved Google Account data from Firestore when user signs in
  useEffect(() => {
    if (!user || !user.uid) return;

    let isMounted = true;
    const loadGoogleAccountData = async () => {
      try {
        const profileRef = doc(db, 'user_profiles', user.uid);
        const docSnap = await getDoc(profileRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<UserLocationAndEspProfile>;
          if (isMounted) {
            const merged: UserLocationAndEspProfile = {
              state: data.state || DEFAULT_PROFILE.state,
              district: data.district || DEFAULT_PROFILE.district,
              area: data.area || DEFAULT_PROFILE.area,
              latitude: data.latitude || DEFAULT_PROFILE.latitude,
              longitude: data.longitude || DEFAULT_PROFILE.longitude,
              espNodeId: data.espNodeId || DEFAULT_PROFILE.espNodeId,
              espWifiSsid: data.espWifiSsid || DEFAULT_PROFILE.espWifiSsid,
              espAuthToken: data.espAuthToken || DEFAULT_PROFILE.espAuthToken,
              espStationName: data.espStationName || DEFAULT_PROFILE.espStationName
            };
            setProfile(merged);
            if (INDIAN_STATES_DATABASE[merged.state]) {
              setSelectedState(merged.state);
            }
            setSelectedDistrict(merged.district);
            setSelectedArea(merged.area);
            setEspNodeId(merged.espNodeId);
            setEspWifiSsid(merged.espWifiSsid);
            setEspAuthToken(merged.espAuthToken);
            setEspStationName(merged.espStationName);
            localStorage.setItem('solar_iot_user_profile_v2', JSON.stringify(merged));
          }
        }
      } catch (err) {
        console.warn('Could not load user profile from Firestore:', err);
      }
    };

    loadGoogleAccountData();
    return () => { isMounted = false; };
  }, [user]);

  // Fetch weather data for given coordinates
  const fetchWeatherForCoords = useCallback(async (
    lat: number, 
    lon: number, 
    st: string, 
    dist: string, 
    ar: string,
    cityLabel: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,direct_radiation,global_tilted_irradiance,uv_index&hourly=uv_index,cloud_cover,direct_radiation,temperature_2m&daily=uv_index_max,sunrise,sunset,precipitation_sum&timezone=auto&forecast_days=2`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch weather data from satellite API');
      const data = await res.json();

      const current = data.current || {};
      const daily = data.daily || {};
      const hourly = data.hourly || {};

      const now = new Date();
      const currentHourStr = now.toISOString().slice(0, 13);
      let startIdx = 0;
      if (hourly.time && Array.isArray(hourly.time)) {
        const found = hourly.time.findIndex((t: string) => t.startsWith(currentHourStr));
        if (found !== -1) startIdx = found;
      }
      const sliceEnd = startIdx + 12;

      const hourlyTimes = (hourly.time || []).slice(startIdx, sliceEnd).map((t: string) => {
        const d = new Date(t);
        return d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
      });
      const hourlyUv = (hourly.uv_index || []).slice(startIdx, sliceEnd);
      const hourlyCloud = (hourly.cloud_cover || []).slice(startIdx, sliceEnd);
      const hourlyRad = (hourly.direct_radiation || []).slice(startIdx, sliceEnd);
      const hourlyTemp = (hourly.temperature_2m || []).slice(startIdx, sliceEnd);

      const parsedData: WeatherData = {
        state: st,
        district: dist,
        area: ar,
        city: cityLabel || dist || st,
        country: 'India',
        latitude: lat,
        longitude: lon,
        temperature: current.temperature_2m ?? 28.5,
        apparentTemperature: current.apparent_temperature ?? 29.2,
        humidity: current.relative_humidity_2m ?? 42,
        cloudCover: current.cloud_cover ?? 12,
        uvIndex: current.uv_index ?? 6.4,
        uvIndexMax: daily.uv_index_max?.[0] ?? 8.7,
        directRadiation: current.direct_radiation ?? 680,
        globalTiltedIrradiance: current.global_tilted_irradiance ?? 740,
        windSpeed: current.wind_speed_10m ?? 11,
        precipitation: current.precipitation ?? 0,
        weatherCode: current.weather_code ?? 0,
        sunrise: daily.sunrise?.[0] ? new Date(daily.sunrise[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '06:12 AM',
        sunset: daily.sunset?.[0] ? new Date(daily.sunset[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '06:28 PM',
        hourlyTimes,
        hourlyUvIndex: hourlyUv,
        hourlyCloudCover: hourlyCloud,
        hourlyDirectRadiation: hourlyRad,
        hourlyTemp,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      setWeather(parsedData);
    } catch (err: any) {
      console.error('Weather fetch error:', err);
      setError(err.message || 'Unable to retrieve meteorological telemetry');
    } finally {
      setLoading(false);
    }
  }, []);

  // Resolve location via Open-Meteo Geocoding
  const resolveAndFetchLocation = useCallback(async (st: string, dist: string, ar: string) => {
    setLoading(true);
    setError(null);
    try {
      const cleanDist = dist.replace(/\s*\(.*?\)\s*/g, '').trim();
      const cleanState = st.replace(/\s*\(.*?\)\s*/g, '').trim();
      const cleanArea = ar ? ar.replace(/\s*\(.*?\)\s*/g, '').trim() : '';

      const queryStr = cleanArea 
        ? `${cleanArea}, ${cleanDist}, ${cleanState}, India`
        : `${cleanDist}, ${cleanState}, India`;

      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryStr)}&count=1&language=en&format=json`;
      
      let lat = profile.latitude;
      let lon = profile.longitude;
      let resolvedCity = dist;

      try {
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          lat = geoData.results[0].latitude;
          lon = geoData.results[0].longitude;
          resolvedCity = geoData.results[0].name;
        } else {
          const fallbackUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(`${cleanDist}, ${cleanState}, India`)}&count=1&language=en&format=json`;
          const fbRes = await fetch(fallbackUrl);
          const fbData = await fbRes.json();
          if (fbData.results && fbData.results.length > 0) {
            lat = fbData.results[0].latitude;
            lon = fbData.results[0].longitude;
            resolvedCity = fbData.results[0].name;
          }
        }
      } catch (geoErr) {
        console.warn('Geocoding lookup warning:', geoErr);
      }

      await fetchWeatherForCoords(lat, lon, st, dist, ar, resolvedCity);
      
      const updatedProfile: UserLocationAndEspProfile = {
        ...profile,
        state: st,
        district: dist,
        area: ar,
        latitude: lat,
        longitude: lon,
        espNodeId,
        espWifiSsid,
        espAuthToken,
        espStationName
      };
      setProfile(updatedProfile);
      autoSaveProfile(updatedProfile);
    } catch (err: any) {
      console.error('Resolve location error:', err);
      setError('Could not locate the specified area. Please select State & District.');
      setLoading(false);
    }
  }, [profile, fetchWeatherForCoords, autoSaveProfile, espNodeId, espWifiSsid, espAuthToken, espStationName]);

  // Initial load
  useEffect(() => {
    resolveAndFetchLocation(selectedState, selectedDistrict, selectedArea);
  }, []);

  // Handle Location Form Submission
  const handleApplyLocation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    resolveAndFetchLocation(selectedState, selectedDistrict, selectedArea);
  };

  // State dropdown change handler
  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    const districts = INDIAN_STATES_DATABASE[newState] || ['Main District'];
    const newDistrict = districts[0] || '';
    setSelectedDistrict(newDistrict);
    resolveAndFetchLocation(newState, newDistrict, selectedArea);
  };

  // District dropdown change handler
  const handleDistrictChange = (newDistrict: string) => {
    setSelectedDistrict(newDistrict);
    resolveAndFetchLocation(selectedState, newDistrict, selectedArea);
  };

  // Save ESP credentials
  const handleSaveEspCredentials = () => {
    const updated: UserLocationAndEspProfile = {
      ...profile,
      espNodeId,
      espWifiSsid,
      espAuthToken,
      espStationName
    };
    setProfile(updated);
    autoSaveProfile(updated);
    setShowEspSettings(false);
  };

  // Calculate Expected Solar Production Potential (%)
  const calculateSolarProductionContext = (cloud: number, uv: number, rad: number) => {
    const cloudFactor = Math.max(0.15, 1 - (cloud / 100) * 0.75);
    const uvFactor = Math.min(1.0, (uv / 8.0));
    const combinedPotential = Math.round((cloudFactor * 0.65 + uvFactor * 0.35) * 100);

    let condition = 'Optimal (Peak Generation Window)';
    let conditionColor = 'text-emerald-400';
    let conditionBg = 'bg-emerald-500/10 border-emerald-500/30';
    let advice = 'Clear skies with strong solar irradiance. Silicon cells generate near-rated peak wattage. Ensure squeegee wipes nightly to prevent optical transmission loss.';

    if (cloud >= 75) {
      condition = 'Severely Reduced (Dense Overcast / Rain)';
      conditionColor = 'text-rose-400';
      conditionBg = 'bg-rose-500/10 border-rose-500/30';
      advice = 'High cloud opacity scatters direct solar beam. Diffuse sunlight will yield approx 20% to 35% of nominal capacity.';
    } else if (cloud >= 40) {
      condition = 'Moderate Generation (Scattered Clouds)';
      conditionColor = 'text-amber-400';
      conditionBg = 'bg-amber-500/10 border-amber-500/30';
      advice = 'Passing cloud shadows will create dynamic fluctuations in PV voltage and current. Inverter MPPT will continuously track peak power.';
    } else if (uv >= 8) {
      condition = 'Ultra-High Solar Yield & High UV Irradiance';
      conditionColor = 'text-cyan-400';
      conditionBg = 'bg-cyan-500/10 border-cyan-500/30';
      advice = 'Maximum solar photon harvest. Surface temperatures exceeding 50°C may introduce -8% to -12% thermal derating on silicon cell efficiency.';
    }

    return {
      potentialPercentage: Math.min(100, Math.max(15, combinedPotential)),
      condition,
      conditionColor,
      conditionBg,
      advice
    };
  };

  const getUvCategory = (uv: number) => {
    if (uv <= 2) return { label: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    if (uv <= 5) return { label: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
    if (uv <= 7) return { label: 'High', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
    if (uv <= 10) return { label: 'Very High', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
    return { label: 'Extreme', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' };
  };

  const solarContext = weather ? calculateSolarProductionContext(weather.cloudCover, weather.uvIndex, weather.directRadiation) : null;
  const uvCategory = weather ? getUvCategory(weather.uvIndex) : null;
  const availableDistricts = INDIAN_STATES_DATABASE[selectedState] || ['Main District'];

  return (
    <section id="weather-section" className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
      {/* Background ambient solar glow */}
      <div className="absolute -top-12 -right-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Clean Header */}
      <div className="border-b border-zinc-800/80 pb-5 relative z-10 space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-wider">
          <Activity className="w-3 h-3" />
          <span>Weather & Solar Forecast Context</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Sun className="w-6 h-6 text-amber-400 shrink-0" />
            <span>Weather, UV Index & Solar Irradiance</span>
          </h2>
          <button
            onClick={() => resolveAndFetchLocation(selectedState, selectedDistrict, selectedArea)}
            disabled={loading}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-700 transition cursor-pointer disabled:opacity-50 flex items-center gap-1 text-xs font-mono"
            title="Refresh weather telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
        <p className="text-xs text-zinc-400 max-w-3xl">
          Select your <strong>Indian State (all 28 states)</strong> and District to track real-time UV index, cloud cover %, and solar radiation. Your selection is automatically saved.
        </p>
      </div>

      {/* State and District Selection Form (28 Indian States) */}
      <div className="bg-black border border-zinc-800 rounded-2xl p-4 sm:p-5 relative z-10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              Select Solar Location: 28 Indian States & Districts
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">
            ● Auto-Saved
          </span>
        </div>

        <form onSubmit={handleApplyLocation} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* 1. Indian States Dropdown (All 28 States) */}
          <div className="sm:col-span-5 space-y-1">
            <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
              1. Select State (All 28 States)
            </label>
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 hover:border-amber-400 text-white text-xs font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {Object.keys(INDIAN_STATES_DATABASE).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* 2. District Dropdown */}
          <div className="sm:col-span-5 space-y-1">
            <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
              2. Select District / City
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 hover:border-amber-400 text-white text-xs font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {availableDistricts.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>

          {/* Fetch / Refresh Button */}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Fetch</span>
            </button>
          </div>
        </form>

        {/* Active Station Summary Tag & ESP Credentials Link */}
        <div className="flex flex-wrap items-center justify-between text-xs font-mono pt-2 border-t border-zinc-900 text-zinc-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-[11px]">Location:</span>
            <span className="text-amber-300 font-bold">
              {selectedDistrict}, {selectedState}
            </span>
            {weather && (
              <span className="text-[10px] text-zinc-500">
                ({weather.latitude.toFixed(2)}°N, {weather.longitude.toFixed(2)}°E)
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowEspSettings(!showEspSettings)}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{showEspSettings ? 'Hide ESP32 Settings' : '⚙️ ESP32 Hardware Login Data'}</span>
            {showEspSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible ESP32 Settings */}
        {showEspSettings && (
          <div className="mt-3 p-4 rounded-xl bg-zinc-950 border border-cyan-500/30 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>ESP32 Hardware Station Login & Persistent Credentials</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Auto-Saved to Cloud
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase">Hardware Node ID</label>
                <input
                  type="text"
                  value={espNodeId}
                  onChange={(e) => setEspNodeId(e.target.value)}
                  placeholder="e.g. node_01"
                  className="w-full bg-black border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase">Station Alias Name</label>
                <input
                  type="text"
                  value={espStationName}
                  onChange={(e) => setEspStationName(e.target.value)}
                  placeholder="e.g. Primary Rooftop Array"
                  className="w-full bg-black border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase">Wi-Fi Network SSID</label>
                <input
                  type="text"
                  value={espWifiSsid}
                  onChange={(e) => setEspWifiSsid(e.target.value)}
                  placeholder="e.g. Solar_IoT_2.4G"
                  className="w-full bg-black border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase">Station Auth Token</label>
                <input
                  type="password"
                  value={espAuthToken}
                  onChange={(e) => setEspAuthToken(e.target.value)}
                  placeholder="e.g. ESP32_SECRET_KEY"
                  className="w-full bg-black border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-zinc-900 text-[11px] font-mono">
              <button
                type="button"
                onClick={handleSaveEspCredentials}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition cursor-pointer"
              >
                Save ESP Data
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Weather Content Cards */}
      {loading && !weather ? (
        <div className="p-12 text-center font-mono text-xs text-zinc-400 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
          <span>Fetching real-time satellite & solar irradiance telemetry for {selectedDistrict}, {selectedState}...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-950/40 border border-rose-500/40 rounded-2xl text-rose-200 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <p className="font-bold">Weather Telemetry Error: {error}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Please check State & District selection.</p>
          </div>
        </div>
      ) : weather ? (
        <div className="space-y-6 relative z-10">
          
          {/* Native Google Weather Widget matching user screenshot */}
          <GoogleWeatherWidget 
            locationCity={weather.area || weather.district || selectedDistrict}
            latitude={weather.latitude}
            longitude={weather.longitude}
          />

          {/* Main Key Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1: UV Index */}
            <div className={`p-4 rounded-2xl border ${uvCategory?.border || 'border-zinc-800'} ${uvCategory?.bg || 'bg-black'} relative overflow-hidden transition-all duration-300 shadow-lg`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">UV Radiation Index</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${uvCategory?.color} bg-black/50 border border-current`}>
                  {uvCategory?.label}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-3xl font-black font-mono ${uvCategory?.color}`}>
                  {weather.uvIndex.toFixed(1)}
                </span>
                <span className="text-xs text-zinc-400 font-mono">/ 12+ (Max: {weather.uvIndexMax.toFixed(1)})</span>
              </div>
              <div className="mt-3 w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-purple-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (weather.uvIndex / 11) * 100)}%` }}
                />
              </div>
              <div className="mt-2 text-[10px] text-zinc-400 font-sans">
                Higher UV index corresponds to higher incident solar photon density.
              </div>
            </div>

            {/* Metric 2: Cloud Cover % */}
            <div className="p-4 rounded-2xl border border-zinc-800 bg-black shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Cloud Cover</span>
                <div className="flex items-center gap-1 text-sky-400 text-xs">
                  {weather.cloudCover < 20 ? <Sun className="w-3.5 h-3.5" /> : weather.cloudCover < 60 ? <CloudSun className="w-3.5 h-3.5" /> : <Cloud className="w-3.5 h-3.5" />}
                  <span className="text-[10px] font-mono font-bold">{weather.cloudCover < 20 ? 'Clear Sky' : weather.cloudCover < 60 ? 'Partly Cloudy' : 'Overcast'}</span>
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-white">
                  {weather.cloudCover}%
                </span>
                <span className="text-xs text-zinc-400 font-mono">Sky Attenuation</span>
              </div>
              <div className="mt-3 w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    weather.cloudCover < 30 ? 'bg-cyan-400' : weather.cloudCover < 70 ? 'bg-amber-400' : 'bg-slate-500'
                  }`}
                  style={{ width: `${weather.cloudCover}%` }}
                />
              </div>
              <div className="mt-2 text-[10px] text-zinc-400 font-sans">
                {weather.cloudCover < 20 ? 'Minimal optical obstruction; 95%+ direct photon transmission.' : `${weather.cloudCover}% cloud cover attenuates direct solar irradiance.`}
              </div>
            </div>

            {/* Metric 3: Direct Solar Irradiance */}
            <div className="p-4 rounded-2xl border border-zinc-800 bg-black shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Direct Irradiance</span>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Solar Flux
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-amber-400">
                  {Math.round(weather.directRadiation)}
                </span>
                <span className="text-xs text-zinc-400 font-mono">W/m²</span>
              </div>
              <div className="mt-3 text-[11px] font-mono text-zinc-300 flex items-center justify-between border-t border-zinc-900 pt-2">
                <span>Global Tilted:</span>
                <span className="text-cyan-300 font-bold">{Math.round(weather.globalTiltedIrradiance)} W/m²</span>
              </div>
              <div className="mt-1 text-[10px] text-zinc-500 font-sans">
                Standard Test Condition (STC) = 1,000 W/m².
              </div>
            </div>

            {/* Metric 4: Ambient Temp & Humidity */}
            <div className="p-4 rounded-2xl border border-zinc-800 bg-black shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Ambient Climate</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Surface Context
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-white">
                  {weather.temperature.toFixed(1)}°C
                </span>
                <span className="text-xs text-zinc-400 font-mono">(Feels {weather.apparentTemperature.toFixed(0)}°C)</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400 border-t border-zinc-900 pt-2">
                <div className="flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-cyan-400" />
                  <span>Humidity: {weather.humidity}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wind className="w-3 h-3 text-emerald-400" />
                  <span>Wind: {weather.windSpeed} km/h</span>
                </div>
              </div>
            </div>

          </div>

          {/* Expected Solar Energy Production Context Banner */}
          {solarContext && (
            <div className={`p-5 rounded-2xl border ${solarContext.conditionBg} shadow-xl relative overflow-hidden backdrop-blur-md`}>
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${solarContext.conditionColor}`} />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
                      Expected Solar Production Potential
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black ${solarContext.conditionColor} bg-black border border-current`}>
                      {solarContext.potentialPercentage}% Potential
                    </span>
                  </div>
                  <h3 className={`text-lg font-black ${solarContext.conditionColor}`}>
                    {solarContext.condition}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {solarContext.advice}
                  </p>
                </div>

                {/* Sun Timing & Solar Window */}
                <div className="bg-black/80 border border-zinc-800 rounded-xl p-3 text-xs font-mono space-y-1.5 shrink-0 w-full lg:w-auto">
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Daylight Window ({weather.district}, {weather.state})</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-white">
                    <div>🌅 Sunrise: <span className="text-amber-300">{weather.sunrise}</span></div>
                    <div>🌇 Sunset: <span className="text-orange-300">{weather.sunset}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hourly Solar Forecast Chart (UV & Cloud Cover over next 12 Hours) */}
          <div className="bg-black border border-zinc-800/90 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                  12-Hour Solar Energy & Cloud Cover Trajectory ({weather.district})
                </h4>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block" />
                  <span>UV Index</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-sky-400 inline-block" />
                  <span>Cloud Cover %</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-400 inline-block" />
                  <span>Direct Radiation (W/m²)</span>
                </span>
              </div>
            </div>

            {/* Timeline Bars Grid */}
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-2">
              {weather.hourlyTimes.map((time, idx) => {
                const uv = weather.hourlyUvIndex[idx] ?? 0;
                const cloud = weather.hourlyCloudCover[idx] ?? 0;
                const rad = weather.hourlyDirectRadiation[idx] ?? 0;

                return (
                  <div key={idx} className="bg-zinc-950 border border-zinc-900 rounded-xl p-2 text-center flex flex-col justify-between space-y-2 hover:border-amber-500/40 transition">
                    <div className="text-[10px] font-mono text-zinc-400 font-semibold">{time}</div>
                    
                    {/* Visual Vertical Stack for UV and Cloud */}
                    <div className="h-20 flex items-end justify-center gap-1 my-1">
                      {/* UV Bar */}
                      <div 
                        className="w-2.5 bg-gradient-to-t from-amber-500 to-yellow-300 rounded-t transition-all duration-500"
                        style={{ height: `${Math.max(6, Math.min(100, (uv / 10) * 100))}%` }}
                        title={`UV Index: ${uv.toFixed(1)}`}
                      />
                      {/* Cloud Bar */}
                      <div 
                        className="w-2.5 bg-gradient-to-t from-sky-600 to-sky-400 rounded-t opacity-80 transition-all duration-500"
                        style={{ height: `${Math.max(6, Math.min(100, cloud))}%` }}
                        title={`Cloud Cover: ${cloud}%`}
                      />
                    </div>

                    <div className="space-y-0.5 border-t border-zinc-900 pt-1 text-[10px] font-mono">
                      <div className="text-amber-400 font-bold">UV {uv.toFixed(1)}</div>
                      <div className="text-sky-400">{cloud}%☁</div>
                      <div className="text-zinc-500 text-[9px]">{Math.round(rad)}W</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Metadata */}
            <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-zinc-900">
              <span>Station: <strong>{weather.district}, {weather.state}</strong> ({weather.latitude.toFixed(2)}°N, {weather.longitude.toFixed(2)}°E)</span>
              <span>Updated: {weather.lastUpdated} • All 28 Indian States Supported</span>
            </div>
          </div>

        </div>
      ) : null}

    </section>
  );
};
