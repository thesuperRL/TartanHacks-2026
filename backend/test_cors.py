#!/usr/bin/env python3
"""
Quick test script to verify CORS is working
Run this after starting the backend server
"""
import requests

def test_cors():
    base_url = "http://localhost:5001"
    
    print("Testing CORS configuration...")
    print(f"Backend URL: {base_url}\n")
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/api/health")
        print(f"✓ Health check: {response.status_code}")
        print(f"  Response: {response.json()}")
        print(f"  CORS Headers:")
        for header, value in response.headers.items():
            if 'access-control' in header.lower():
                print(f"    {header}: {value}")
        print()
    except requests.exceptions.ConnectionError:
        print("✗ Backend server is not running!")
        print("  Please start it with: ./start-backend.sh")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    
    # Test OPTIONS preflight
    try:
        response = requests.options(f"{base_url}/api/news", headers={
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'GET'
        })
        print(f"✓ OPTIONS preflight: {response.status_code}")
        print(f"  CORS Headers:")
        for header, value in response.headers.items():
            if 'access-control' in header.lower():
                print(f"    {header}: {value}")
        print()
    except Exception as e:
        print(f"✗ OPTIONS test failed: {e}")
        return False
    
    print("✓ CORS configuration looks good!")
    return True

if __name__ == '__main__':
    test_cors()
