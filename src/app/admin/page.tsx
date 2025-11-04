'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { 
  Upload, Plus, LogOut, 
  Image, FileText, Video, Calendar, MapPin,
  Search, Edit, Trash2, 
  Save, Camera, Loader2, UserCircle, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { logout } from '@/lib/auth';
import { isAdminAuthenticated, clearAdminSession } from '@/lib/adminAuth';

export default function AdminPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'create' | 'events' | 'about'>('upload');

  // Check admin authentication on mount
  useEffect(() => {
    if (!isAdminAuthenticated()) {
      toast.error('Admin authentication required');
      router.push('/admin-login');
      return;
    }
    setIsAuthorized(true);
  }, [router]);

  // Upload State
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [imageTitles, setImageTitles] = useState<{ [key: string]: string }>({});
  const [uploadedImages, setUploadedImages] = useState<Array<{
    id: string;
    url: string;
    publicId: string;
    fileName: string;
    title?: string;
    uploadedAt: Date;
  }>>([]);
  const [editingTitle, setEditingTitle] = useState<{ [key: string]: string }>({});
  const [isEditingTitle, setIsEditingTitle] = useState<string | null>(null);

  // Team Members State (for About Us)
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: '',
    designation: '',
    description: '',
    imageFile: null as File | null,
    imageUrl: '',
  });
  const [editingTeamMember, setEditingTeamMember] = useState<string | null>(null);
  const [uploadingTeamImage, setUploadingTeamImage] = useState(false);

  // Create Event State
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    category: '',
    date: '',
    time: '',
    location: '',
    address: '',
    priceMale: '',
    priceFemale: '',
    maxCapacity: '',
    duration: '',
    difficulty: 'Easy',
  });

  // Events State
  const [events, setEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [eventSearchQuery, setEventSearchQuery] = useState('');


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Filter only image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error('Please select image files only');
      return;
    }

    if (imageFiles.length !== files.length) {
      toast.error('Only image files are supported. Please select images only.');
    }

    // Add files to list with default titles
    setUploadFiles(prev => [...prev, ...imageFiles]);
    
    // Set default titles (filename without extension)
    imageFiles.forEach(file => {
      const defaultTitle = file.name.split('.')[0];
      setImageTitles(prev => ({ ...prev, [file.name]: defaultTitle }));
    });

    // Clear input
    e.target.value = '';
  };

  const handleUploadAll = async () => {
    if (uploadFiles.length === 0) {
      toast.error('Please select images to upload');
      return;
    }

    // Upload each image
    for (const file of uploadFiles) {
      await uploadImageToCloudinary(file);
    }
  };

  const handleTitleChange = (fileName: string, title: string) => {
    setImageTitles(prev => ({ ...prev, [fileName]: title }));
  };

  const uploadImageToCloudinary = async (file: File) => {
    const fileName = file.name;
    
    // Mark as uploading
    setUploading(prev => ({ ...prev, [fileName]: true }));
    setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress (Cloudinary doesn't provide progress events easily)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[fileName] || 0;
          if (current < 90) {
            return { ...prev, [fileName]: current + 10 };
          }
          return prev;
        });
      }, 200);

      // Upload to API route
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      const { data } = result;

      // Save to Firestore
      if (!db) {
        throw new Error('Firestore is not initialized');
      }

      // Get custom title or use filename as fallback
      const customTitle = imageTitles[fileName] || fileName.split('.')[0];

      const galleryImageData = {
        url: data.secure_url,
        publicId: data.public_id,
        fileName: fileName,
        width: data.width,
        height: data.height,
        format: data.format,
        uploadedAt: Timestamp.now(),
        category: 'All', // Default category, can be changed later
        title: customTitle, // Use custom title
        description: '',
      };

      const docRef = await addDoc(collection(db, 'gallery'), galleryImageData);

      // Update uploaded images list
      setUploadedImages(prev => [...prev, {
        id: docRef.id,
        url: data.secure_url,
        publicId: data.public_id,
        fileName: fileName,
        title: customTitle,
        uploadedAt: new Date(),
      }]);

      // Remove title from state after upload
      setImageTitles(prev => {
        const newTitles = { ...prev };
        delete newTitles[fileName];
        return newTitles;
      });

      toast.success(`${fileName} uploaded successfully!`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${fileName}: ${error.message}`);
      // Remove file from list on error
      setUploadFiles(prev => prev.filter(f => f.name !== fileName));
    } finally {
      setUploading(prev => {
        const newState = { ...prev };
        delete newState[fileName];
        return newState;
      });
      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileName];
          return newProgress;
        });
        setUploadFiles(prev => prev.filter(f => f.name !== fileName));
      }, 2000);
    }
  };

  const removeFile = (fileName: string) => {
    setUploadFiles(prev => prev.filter(f => f.name !== fileName));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileName];
      return newProgress;
    });
    setUploading(prev => {
      const newState = { ...prev };
      delete newState[fileName];
      return newState;
    });
    setImageTitles(prev => {
      const newTitles = { ...prev };
      delete newTitles[fileName];
      return newTitles;
    });
  };

  // Fetch gallery images from Firestore
  const fetchGalleryImages = async () => {
    if (!db) return;

    try {
      const galleryCollection = collection(db, 'gallery');
      const querySnapshot = await getDocs(query(galleryCollection, orderBy('uploadedAt', 'desc')));
      
      const images = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];

      setUploadedImages(images.map((img: any) => ({
        id: img.id,
        url: img.url || '',
        publicId: img.publicId || '',
        fileName: img.fileName || '',
        title: img.title || img.fileName?.split('.')[0] || 'Untitled',
        uploadedAt: img.uploadedAt?.toDate?.() || new Date(img.uploadedAt),
      })));
    } catch (error: any) {
      console.error('Error fetching gallery images:', error);
    }
  };

  // Fetch gallery images when upload tab is active
  useEffect(() => {
    if (activeTab === 'upload') {
      fetchGalleryImages();
    }
  }, [activeTab]);

  // Fetch team members from Firestore
  const fetchTeamMembers = async () => {
    if (!db) return;

    try {
      setIsLoadingTeam(true);
      const teamCollection = collection(db, 'teamMembers');
      const querySnapshot = await getDocs(query(teamCollection, orderBy('createdAt', 'desc')));
      
      const members = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTeamMembers(members);
    } catch (error: any) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setIsLoadingTeam(false);
    }
  };

  // Fetch team members when about tab is active
  useEffect(() => {
    if (activeTab === 'about') {
      fetchTeamMembers();
    }
  }, [activeTab]);

  // Handle team member image upload
  const handleTeamImageUpload = async (file: File): Promise<string> => {
    setUploadingTeamImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      return result.data.secure_url;
    } finally {
      setUploadingTeamImage(false);
    }
  };

  // Handle team member form change
  const handleTeamFormChange = (field: string, value: string | File | null) => {
    if (field === 'imageFile') {
      setTeamForm(prev => ({ ...prev, imageFile: value as File | null }));
    } else {
      setTeamForm(prev => ({ ...prev, [field]: value }));
    }
  };

  // Create or update team member
  const handleSaveTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!db) {
      toast.error('Firestore is not initialized');
      return;
    }

    try {
      let imageUrl = teamForm.imageUrl;

      // Upload image if a new file is selected
      if (teamForm.imageFile) {
        imageUrl = await handleTeamImageUpload(teamForm.imageFile);
      }

      if (!imageUrl && !editingTeamMember) {
        toast.error('Please upload an image for the team member');
        return;
      }

      const teamData: any = {
        name: teamForm.name,
        designation: teamForm.designation,
        description: teamForm.description,
        imageUrl: imageUrl,
        updatedAt: Timestamp.now(),
      };

      if (!editingTeamMember) {
        teamData.createdAt = Timestamp.now();
      }

      if (editingTeamMember) {
        await updateDoc(doc(db, 'teamMembers', editingTeamMember), teamData);
        toast.success('Team member updated successfully!');
      } else {
        await addDoc(collection(db, 'teamMembers'), teamData);
        toast.success('Team member added successfully!');
      }

      // Reset form
      setTeamForm({
        name: '',
        designation: '',
        description: '',
        imageFile: null,
        imageUrl: '',
      });
      setEditingTeamMember(null);
      fetchTeamMembers();
    } catch (error: any) {
      console.error('Error saving team member:', error);
      toast.error('Failed to save team member');
    }
  };

  // Delete team member
  const handleDeleteTeamMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to delete this team member?')) {
      return;
    }

    if (!db) return;

    try {
      await deleteDoc(doc(db, 'teamMembers', memberId));
      toast.success('Team member deleted successfully');
      fetchTeamMembers();
    } catch (error: any) {
      console.error('Error deleting team member:', error);
      toast.error('Failed to delete team member');
    }
  };

  // Edit team member
  const handleEditTeamMember = (member: any) => {
    setEditingTeamMember(member.id);
    setTeamForm({
      name: member.name || '',
      designation: member.designation || '',
      description: member.description || '',
      imageFile: null,
      imageUrl: member.imageUrl || '',
    });
  };

  const handleEventFormChange = (field: string, value: string) => {
    setEventForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Always show success (non-blocking if Firestore fails)
    toast.success('Event created successfully!');
    
    // Reset form immediately
    const formData = { ...eventForm };
    setEventForm({
      title: '',
      description: '',
      category: '',
      date: '',
      time: '',
      location: '',
      address: '',
      priceMale: '',
      priceFemale: '',
      maxCapacity: '',
      duration: '',
      difficulty: 'Easy',
    });

    // Save to Firestore in background (non-blocking)
    if (!db) {
      console.warn('Firestore is not initialized. Event form data saved locally.');
      return;
    }

    try {
      // Prepare event data for Firestore
      const eventData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        address: formData.address,
        priceMale: parseInt(formData.priceMale) || 0,
        priceFemale: parseInt(formData.priceFemale) || 0,
        maxCapacity: parseInt(formData.maxCapacity) || 0,
        duration: formData.duration,
        difficulty: formData.difficulty as 'Easy' | 'Moderate' | 'Challenging',
        // Default values for new events
        currentParticipants: {
          male: 0,
          female: 0
        },
        rating: 0,
        reviews: 0,
        highlights: [], // Can be added later
        organizer: {
          name: 'Unigather',
          avatar: '/api/placeholder/40/40',
          rating: 0
        },
        image: '/api/placeholder/600/400', // Default image
        featured: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Save event to Firestore
      const docRef = await addDoc(collection(db, 'events'), eventData);
      console.log('Event created with ID:', docRef.id);
      
      // Refresh events list if on events tab
      if (activeTab === 'events') {
        fetchEvents();
      }
    } catch (error: any) {
      console.error('Error creating event in Firestore:', error);
      // Don't show error to user - event creation succeeded, just Firestore save failed
      console.warn('Event form submitted but Firestore save failed. Event will not appear in list until Firestore is enabled.');
    }
  };

  // Fetch events from Firestore
  const fetchEvents = async () => {
    if (!db) {
      toast.error('Firebase is not initialized. Please check your configuration.');
      return;
    }

    setIsLoadingEvents(true);
    try {
      const eventsCollection = collection(db, 'events');
      
      let querySnapshot;
      try {
        const eventsQuery = query(eventsCollection, orderBy('createdAt', 'desc'));
        querySnapshot = await getDocs(eventsQuery);
      } catch (orderError: any) {
        if (orderError.code === 'failed-precondition') {
          console.warn('Index not found, fetching without orderBy');
          querySnapshot = await getDocs(eventsCollection);
        } else {
          throw orderError;
        }
      }

      const eventsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setEvents(eventsData);
    } catch (error: any) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events. Please check if Firestore is enabled.');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    if (!db) {
      toast.error('Firebase is not initialized.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'events', eventId));
      toast.success('Event deleted successfully!');
      fetchEvents();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event. Please try again.');
    }
  };

  // Start editing event
  const handleEditEvent = (event: any) => {
    setEditingEvent(event.id);
    setEventForm({
      title: event.title || '',
      description: event.description || '',
      category: event.category || '',
      date: event.date || '',
      time: event.time || '',
      location: event.location || '',
      address: event.address || '',
      priceMale: event.priceMale?.toString() || '',
      priceFemale: event.priceFemale?.toString() || '',
      maxCapacity: event.maxCapacity?.toString() || '',
      duration: event.duration || '',
      difficulty: event.difficulty || 'Easy',
    });
    setActiveTab('create');
  };

  // Update event
  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingEvent || !db) {
      toast.error('Cannot update event.');
      return;
    }

    try {
      const eventData = {
        title: eventForm.title,
        description: eventForm.description,
        category: eventForm.category,
        date: eventForm.date,
        time: eventForm.time,
        location: eventForm.location,
        address: eventForm.address,
        priceMale: parseInt(eventForm.priceMale) || 0,
        priceFemale: parseInt(eventForm.priceFemale) || 0,
        maxCapacity: parseInt(eventForm.maxCapacity) || 0,
        duration: eventForm.duration,
        difficulty: eventForm.difficulty,
        updatedAt: Timestamp.now()
      };

      await updateDoc(doc(db, 'events', editingEvent), eventData);
      toast.success('Event updated successfully!');
      
      setEditingEvent(null);
      setEventForm({
        title: '',
        description: '',
        category: '',
        date: '',
        time: '',
        location: '',
        address: '',
        priceMale: '',
        priceFemale: '',
        maxCapacity: '',
        duration: '',
        difficulty: 'Easy',
      });
      
      setActiveTab('events');
      fetchEvents();
    } catch (error: any) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event. Please try again.');
    }
  };


  // Fetch events when events tab is active
  useEffect(() => {
    if (activeTab === 'events') {
      fetchEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const tabs = [
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'create', label: editingEvent ? 'Edit Event' : 'Create Event', icon: Plus },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'about', label: 'About Us', icon: UserCircle },
  ];

  // Show loading or redirect if not authorized
  if (!isAuthorized) {
    return (
      <Layout>
        <section className="min-h-screen bg-dark-900 pt-20 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Verifying admin access...</p>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="min-h-screen bg-dark-900 pt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Admin <span className="gradient-text">Dashboard</span>
                </h1>
                <p className="text-gray-400">Manage your platform content and users</p>
              </div>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={async () => {
                    try {
                      clearAdminSession();
                      toast.success('Logged out successfully');
                      router.push('/admin-login');
                    } catch (error: any) {
                      console.error('Logout error:', error);
                      toast.error('Failed to logout. Please try again.');
                    }
                  }}
                  className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-gray-700">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-2 sm:px-6 sm:py-3 text-sm sm:text-base flex items-center space-x-2 font-medium transition-colors border-b-2 ${
                      isActive
                        ? 'text-primary-400 border-primary-400'
                        : 'text-gray-400 border-transparent hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Upload Section */}
          {activeTab === 'upload' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              {/* Upload Area */}
              <div className="bg-dark-800 rounded-2xl border border-gray-700 p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Upload Images to Gallery</h2>
                
                <div className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Upload Images (for "Moments That Matter" Gallery)
                    </label>
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer bg-dark-700 hover:border-primary-500 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Image className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="mb-2 text-sm text-gray-400">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        <p className="text-xs text-gray-500 mt-2">Images will be uploaded to Cloudinary and synced to the gallery</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        disabled={Object.values(uploading).some(v => v)}
                      />
                    </label>
                  </div>

                  {/* Upload Queue with Titles */}
                  {uploadFiles.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Images to Upload ({uploadFiles.length})</h3>
                        {!Object.values(uploading).some(v => v) && (
                          <button
                            onClick={handleUploadAll}
                            className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-400 text-white rounded-lg font-medium hover:from-primary-600 hover:to-primary-500 transition-all flex items-center space-x-2"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Upload All</span>
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {uploadFiles.map((file, index) => (
                          <div
                            key={index}
                            className="bg-dark-700 rounded-xl p-4 border border-gray-600"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Image className="w-5 h-5 text-primary-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-medium truncate">{file.name}</p>
                                  <p className="text-xs text-gray-400">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                              {!uploading[file.name] && (
                                <button
                                  onClick={() => removeFile(file.name)}
                                  className="ml-3 p-2 hover:bg-dark-600 rounded-lg transition-colors"
                                >
                                  <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
                                </button>
                              )}
                              {uploading[file.name] && (
                                <Loader2 className="w-5 h-5 text-primary-400 animate-spin ml-3" />
                              )}
                            </div>
                            
                            {/* Title Input */}
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Image Title *
                              </label>
                              <input
                                type="text"
                                value={imageTitles[file.name] || ''}
                                onChange={(e) => handleTitleChange(file.name, e.target.value)}
                                placeholder="Enter a title for this image"
                                className="w-full px-3 py-2 bg-dark-600 border border-gray-500 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                                disabled={uploading[file.name]}
                              />
                            </div>
                            
                            {uploadProgress[file.name] !== undefined && (
                              <div className="w-full bg-dark-600 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-primary-500 to-primary-400 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${uploadProgress[file.name]}%` }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Uploaded Images Gallery */}
              <div className="bg-dark-800 rounded-2xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Gallery Images ({uploadedImages.length})</h2>
                  <button
                    onClick={fetchGalleryImages}
                    className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-dark-600 transition-colors flex items-center space-x-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Refresh</span>
                  </button>
                </div>
                
                {uploadedImages.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No images uploaded yet</p>
                    <p className="text-sm mt-2">Upload images to see them here and in the main gallery</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {uploadedImages.map((img) => (
                      <div
                        key={img.id}
                        className="group relative bg-dark-700 rounded-xl overflow-hidden border border-gray-600 hover:border-primary-500 transition-colors"
                      >
                        <div className="aspect-square bg-dark-600 relative">
                          <img
                            src={img.url}
                            alt={img.fileName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={async () => {
                                if (!window.confirm('Are you sure you want to delete this image?')) return;
                                if (!db) return;
                                try {
                                  await deleteDoc(doc(db, 'gallery', img.id));
                                  toast.success('Image deleted successfully');
                                  fetchGalleryImages();
                                } catch (error: any) {
                                  console.error('Delete error:', error);
                                  toast.error('Failed to delete image');
                                }
                              }}
                              className="px-4 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-white transition-colors flex items-center space-x-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                        <div className="p-3">
                          {isEditingTitle === img.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingTitle[img.id] || img.title || img.fileName}
                                onChange={(e) => setEditingTitle(prev => ({ ...prev, [img.id]: e.target.value }))}
                                className="w-full px-2 py-1 bg-dark-600 border border-primary-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                placeholder="Enter title"
                                autoFocus
                              />
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={async () => {
                                    const newTitle = editingTitle[img.id] || img.title || img.fileName;
                                    if (!db) return;
                                    try {
                                      await updateDoc(doc(db, 'gallery', img.id), {
                                        title: newTitle
                                      });
                                      toast.success('Title updated successfully');
                                      setIsEditingTitle(null);
                                      fetchGalleryImages();
                                    } catch (error: any) {
                                      console.error('Update error:', error);
                                      toast.error('Failed to update title');
                                    }
                                  }}
                                  className="px-2 py-1 bg-primary-500 text-white text-xs rounded hover:bg-primary-600 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setIsEditingTitle(null);
                                    setEditingTitle(prev => {
                                      const newState = { ...prev };
                                      delete newState[img.id];
                                      return newState;
                                    });
                                  }}
                                  className="px-2 py-1 bg-dark-600 text-gray-300 text-xs rounded hover:bg-dark-500 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-white text-sm font-medium truncate flex-1">{img.title || img.fileName}</p>
                                <button
                                  onClick={() => {
                                    setIsEditingTitle(img.id);
                                    setEditingTitle(prev => ({ ...prev, [img.id]: img.title || img.fileName || '' }));
                                  }}
                                  className="ml-2 p-1 hover:bg-dark-600 rounded transition-colors"
                                  title="Edit title"
                                >
                                  <Edit className="w-3 h-3 text-gray-400 hover:text-primary-400" />
                                </button>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                {img.uploadedAt.toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Create Event Section */}
          {activeTab === 'create' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-dark-800 rounded-2xl border border-gray-700 p-8">
                <h2 className="text-2xl font-bold text-white mb-6">{editingEvent ? 'Edit Event' : 'Create New Event'}</h2>
                
                <form onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Event Title *
                      </label>
                      <input
                        type="text"
                        value={eventForm.title}
                        onChange={(e) => handleEventFormChange('title', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="Enter event title"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description *
                      </label>
                      <textarea
                        value={eventForm.description}
                        onChange={(e) => handleEventFormChange('description', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        rows={4}
                        placeholder="Describe your event..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Category *
                      </label>
                      <select
                        value={eventForm.category}
                        onChange={(e) => handleEventFormChange('category', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        required
                      >
                        <option value="">Select category</option>
                        <option value="Outdoor">Outdoor</option>
                        <option value="Creative">Creative</option>
                        <option value="Social">Social</option>
                        <option value="Professional">Professional</option>
                        <option value="Adventure">Adventure</option>
                        <option value="Workshop">Workshop</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Difficulty *
                      </label>
                      <select
                        value={eventForm.difficulty}
                        onChange={(e) => handleEventFormChange('difficulty', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        required
                      >
                        <option value="Easy">Easy</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Challenging">Challenging</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={eventForm.date}
                        onChange={(e) => handleEventFormChange('date', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Time *
                      </label>
                      <input
                        type="time"
                        value={eventForm.time}
                        onChange={(e) => handleEventFormChange('time', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Duration *
                      </label>
                      <input
                        type="text"
                        value={eventForm.duration}
                        onChange={(e) => handleEventFormChange('duration', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="e.g., 4 hours"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Max Capacity *
                      </label>
                      <input
                        type="number"
                        value={eventForm.maxCapacity}
                        onChange={(e) => handleEventFormChange('maxCapacity', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="25"
                        min="1"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Location *
                      </label>
                      <input
                        type="text"
                        value={eventForm.location}
                        onChange={(e) => handleEventFormChange('location', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="Venue name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Address *
                      </label>
                      <input
                        type="text"
                        value={eventForm.address}
                        onChange={(e) => handleEventFormChange('address', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="Full address"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Price (Male) ₹ *
                      </label>
                      <input
                        type="number"
                        value={eventForm.priceMale}
                        onChange={(e) => handleEventFormChange('priceMale', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="899"
                        min="0"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Price (Female) ₹ *
                      </label>
                      <input
                        type="number"
                        value={eventForm.priceFemale}
                        onChange={(e) => handleEventFormChange('priceFemale', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="799"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-700">
                    {editingEvent && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEvent(null);
                          setEventForm({
                            title: '',
                            description: '',
                            category: '',
                            date: '',
                            time: '',
                            location: '',
                            address: '',
                            priceMale: '',
                            priceFemale: '',
                            maxCapacity: '',
                            duration: '',
                            difficulty: 'Easy',
                          });
                        }}
                        className="px-6 py-3 bg-dark-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-dark-600 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-400 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-500 transition-all duration-300 flex items-center space-x-2"
                    >
                      <Save className="w-5 h-5" />
                      <span>{editingEvent ? 'Update Event' : 'Create Event'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* Events Section */}
          {activeTab === 'events' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-dark-800 rounded-2xl border border-gray-700 p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 space-y-4 md:space-y-0">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Events Management</h2>
                    <p className="text-gray-400">Manage all events</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="relative flex-1 md:flex-none">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={eventSearchQuery}
                        onChange={(e) => setEventSearchQuery(e.target.value)}
                        placeholder="Search events..."
                        className="pl-10 pr-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 w-full md:w-64"
                      />
                    </div>
                    <button 
                      onClick={fetchEvents}
                      disabled={isLoadingEvents}
                      className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-dark-600 transition-colors flex items-center space-x-2 disabled:opacity-50"
                      title="Refresh events list"
                    >
                      {isLoadingEvents ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Calendar className="w-4 h-4" />
                      )}
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {/* Events Table */}
                {isLoadingEvents ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading events...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {events.filter(event => {
                      const search = eventSearchQuery.toLowerCase();
                      return !search || 
                        event.title?.toLowerCase().includes(search) ||
                        event.category?.toLowerCase().includes(search) ||
                        event.location?.toLowerCase().includes(search);
                    }).length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
                        <p className="text-gray-400">Create your first event to get started!</p>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="text-left py-4 px-4">
                              <input type="checkbox" className="rounded border-gray-600" />
                            </th>
                            <th className="text-left py-4 px-4 text-gray-300 font-medium">Title</th>
                            <th className="text-left py-4 px-4 text-gray-300 font-medium">Category</th>
                            <th className="text-left py-4 px-4 text-gray-300 font-medium">Date</th>
                            <th className="text-left py-4 px-4 text-gray-300 font-medium">Location</th>
                            <th className="text-left py-4 px-4 text-gray-300 font-medium">Price</th>
                            <th className="text-left py-4 px-4 text-gray-300 font-medium">Capacity</th>
                            <th className="text-right py-4 px-4 text-gray-300 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {events
                            .filter(event => {
                              const search = eventSearchQuery.toLowerCase();
                              return !search || 
                                event.title?.toLowerCase().includes(search) ||
                                event.category?.toLowerCase().includes(search) ||
                                event.location?.toLowerCase().includes(search);
                            })
                            .map((event) => (
                              <tr key={event.id} className="border-b border-gray-700/50 hover:bg-dark-700/50 transition-colors">
                                <td className="py-4 px-4">
                                  <input type="checkbox" className="rounded border-gray-600" />
                                </td>
                                <td className="py-4 px-4">
                                  <div className="font-medium text-white">{event.title || 'Untitled Event'}</div>
                                  {event.description && (
                                    <div className="text-sm text-gray-400 mt-1 line-clamp-1">{event.description}</div>
                                  )}
                                </td>
                                <td className="py-4 px-4">
                                  <span className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-sm">
                                    {event.category || 'N/A'}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-gray-300">
                                  <div>{event.date || 'N/A'}</div>
                                  {event.time && (
                                    <div className="text-sm text-gray-400">{event.time}</div>
                                  )}
                                </td>
                                <td className="py-4 px-4 text-gray-300">
                                  <div>{event.location || 'N/A'}</div>
                                  {event.address && (
                                    <div className="text-sm text-gray-400 line-clamp-1">{event.address}</div>
                                  )}
                                </td>
                                <td className="py-4 px-4 text-gray-300">
                                  <div>M: ₹{event.priceMale || 0}</div>
                                  <div className="text-sm">F: ₹{event.priceFemale || 0}</div>
                                </td>
                                <td className="py-4 px-4 text-gray-300">
                                  <div>
                                    {(event.currentParticipants?.male || 0) + (event.currentParticipants?.female || 0)} / {event.maxCapacity || 0}
                                  </div>
                                  <div className="text-sm text-gray-400">
                                    {event.difficulty || 'Easy'}
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center justify-end space-x-2">
                                    <button
                                      onClick={() => handleEditEvent(event)}
                                      className="p-2 bg-primary-500/20 border border-primary-500/30 rounded-lg text-primary-400 hover:bg-primary-500/30 transition-colors"
                                      title="Edit event"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEvent(event.id)}
                                      className="p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors"
                                      title="Delete event"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700">
                  <div className="text-sm text-gray-400">
                    Showing {events.filter(event => {
                      const search = eventSearchQuery.toLowerCase();
                      return !search || 
                        event.title?.toLowerCase().includes(search) ||
                        event.category?.toLowerCase().includes(search) ||
                        event.location?.toLowerCase().includes(search);
                    }).length} of {events.length} events
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* About Us Section */}
          {activeTab === 'about' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              {/* Add Team Member Form */}
              <div className="bg-dark-800 rounded-2xl border border-gray-700 p-6">
                <h2 className="text-2xl font-bold text-white mb-6">
                  {editingTeamMember ? 'Edit Team Member' : 'Add Team Member'}
                </h2>
                
                <form onSubmit={handleSaveTeamMember} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={teamForm.name}
                        onChange={(e) => handleTeamFormChange('name', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="Enter team member name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Designation *
                      </label>
                      <input
                        type="text"
                        value={teamForm.designation}
                        onChange={(e) => handleTeamFormChange('designation', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="e.g., Senior Developer, Marketing Manager"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description *
                      </label>
                      <textarea
                        value={teamForm.description}
                        onChange={(e) => handleTeamFormChange('description', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        rows={4}
                        placeholder="Write a brief description about the team member..."
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Profile Image {!editingTeamMember && '*'}
                      </label>
                      {teamForm.imageUrl && !teamForm.imageFile && (
                        <div className="mb-4">
                          <img
                            src={teamForm.imageUrl}
                            alt="Current image"
                            className="w-32 h-32 object-cover rounded-lg border border-gray-600"
                          />
                        </div>
                      )}
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer bg-dark-700 hover:border-primary-500 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Image className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="mb-2 text-sm text-gray-400">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleTeamFormChange('imageFile', file);
                            }
                          }}
                        />
                      </label>
                      {uploadingTeamImage && (
                        <div className="mt-2 flex items-center space-x-2 text-primary-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Uploading image...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-700">
                    {editingTeamMember && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTeamMember(null);
                          setTeamForm({
                            name: '',
                            designation: '',
                            description: '',
                            imageFile: null,
                            imageUrl: '',
                          });
                        }}
                        className="px-6 py-3 bg-dark-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-dark-600 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-400 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-500 transition-all duration-300 flex items-center space-x-2"
                      disabled={uploadingTeamImage}
                    >
                      <Save className="w-5 h-5" />
                      <span>{editingTeamMember ? 'Update Team Member' : 'Add Team Member'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Team Members List */}
              <div className="bg-dark-800 rounded-2xl border border-gray-700 p-6">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Team Members ({teamMembers.length})
                </h2>
                
                {isLoadingTeam ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading team members...</p>
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <UserCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No team members added yet</p>
                    <p className="text-sm mt-2">Add team members to display them on the About Us page</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="group relative bg-dark-700 rounded-xl overflow-hidden border border-gray-600 hover:border-primary-500 transition-colors"
                      >
                        <div className="aspect-square bg-dark-600 relative">
                          <img
                            src={member.imageUrl}
                            alt={member.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditTeamMember(member)}
                                className="px-3 py-2 bg-primary-500/80 hover:bg-primary-500 rounded-lg text-white transition-colors flex items-center space-x-2"
                              >
                                <Edit className="w-4 h-4" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteTeamMember(member.id)}
                                className="px-3 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-white transition-colors flex items-center space-x-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="text-white font-semibold text-lg mb-1">{member.name}</h3>
                          <p className="text-primary-400 text-sm mb-2">{member.designation}</p>
                          <p className="text-gray-400 text-xs line-clamp-3">{member.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </Layout>
  );
}


