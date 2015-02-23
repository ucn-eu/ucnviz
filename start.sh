#!/bin/bash
source venv/bin/activate
gunicorn -b 0.0.0.0:8000 ucnserver:app &
