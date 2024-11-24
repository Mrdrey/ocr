import React, { useState, useEffect } from 'react';
import { View, Text, Button, Image, StyleSheet, ActivityIndicator, Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const API_URL = 'http://192.168.100.153:5000';

export default function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [serverStatus, setServerStatus] = useState('checking');

  // Test server connection on component mount
  useEffect(() => {
    checkServerConnection();
  }, []);

  const checkServerConnection = async () => {
    try {
      const response = await axios.get(`${API_URL}/test`, { timeout: 5000 });
      if (response.data.status === 'Server is running') {
        setServerStatus('connected');
        console.log('Server is accessible');
      }
    } catch (error) {
      console.error('Server connection error:', error);
      setServerStatus('disconnected');
      Alert.alert(
        'Server Connection Error',
        'Cannot connect to the server. Please check:\n\n' +
        '1. Server is running\n' +
        '2. IP address is correct\n' +
        '3. You\'re on the same network\n' +
        '4. No firewall blocking the connection',
        [
          { text: 'Retry', onPress: checkServerConnection },
          { text: 'OK' }
        ]
      );
    }
  };

  const pickImage = async () => {
    if (serverStatus !== 'connected') {
      Alert.alert('Server Not Connected', 'Please wait for server connection');
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        alert('Permission to access media library is required!');
        return;
      }
    
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        base64: true,
      });
    
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log('Selected image:', asset.uri);
        setSelectedImage(asset.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Failed to pick image. Please try again.');
    }
  };

  const createFormData = (uri) => {
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    const formData = new FormData();
    formData.append('image', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      name: filename,
      type,
    });
    formData.append('language', language);

    return formData;
  };

  const handleTranslation = async () => {
    if (!selectedImage) {
      alert('Please select an image first');
      return;
    }

    setLoading(true);

    try {
      const formData = createFormData(selectedImage);
      
      console.log('Sending request to:', `${API_URL}/process`);

      const response = await axios.post(`${API_URL}/process`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      console.log('Server response:', response.data);

      if (response.data && response.data.translated_text) {
        setTranslatedText(response.data.translated_text);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Translation error:', error);
      if (error.response) {
        console.error('Server error data:', error.response.data);
        alert(`Server error: ${error.response.data.error || 'Unknown error'}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        alert('Connection failed. Please check your network and server status.');
      } else {
        console.error('Error:', error.message);
        alert('Error: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {serverStatus === 'checking' && (
        <Text style={styles.statusText}>Checking server connection...</Text>
      )}
      {serverStatus === 'disconnected' && (
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, styles.errorText]}>Server not connected</Text>
          <Button title="Retry Connection" onPress={checkServerConnection} />
        </View>
      )}
      
      <Button 
        title="Select Image" 
        onPress={pickImage}
        disabled={loading || serverStatus !== 'connected'}
      />
      
      {selectedImage && (
        <Image 
          source={{ uri: selectedImage }} 
          style={styles.image}
          resizeMode="contain"
        />
      )}
      
      <View style={styles.languageSelector}>
        <Button 
          title="English" 
          onPress={() => setLanguage('en')}
          disabled={loading} 
        />
        <Button 
          title="French" 
          onPress={() => setLanguage('fr')}
          disabled={loading}
        />
        <Button 
          title="Spanish" 
          onPress={() => setLanguage('es')}
          disabled={loading}
        />
      </View>
      
      <Button 
        title="Translate" 
        onPress={handleTranslation}
        disabled={!selectedImage || loading || serverStatus !== 'connected'}
      />
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Processing image...</Text>
        </View>
      )}
      
      {translatedText ? (
        <Text style={styles.translatedText}>
          Translation: {translatedText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  statusContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  statusText: {
    marginBottom: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
  },
  image: {
    width: '100%',
    height: 200,
    marginVertical: 20,
    borderRadius: 8,
  },
  languageSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  loadingContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  translatedText: {
    marginTop: 20,
    fontSize: 18,
    color: '#2196F3',
    textAlign: 'center',
  },
});